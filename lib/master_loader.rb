require "zlib"
require "digest"
require "csv"

class MasterLoader
  CONFIG_PATH = Rails.root.join("config/master_data.yml")

  def self.from_config(logger: Logger.new($stdout))
    config = YAML.safe_load_file(CONFIG_PATH).fetch("editions")
    new(path: Rails.root.join(config.fetch("path")), sha256: config.fetch("sha256"), logger:)
  end

  def initialize(path:, sha256: nil, logger: Logger.new($stdout))
    @path = Pathname(path)
    @sha256 = sha256
    @logger = logger
  end

  def run
    path = @path
    raise "master data not found: #{path}" unless path.exist?
    verify!(path) if @sha256
    connection = ActiveRecord::Base.connection
    inserted = connection.transaction do
      connection.execute(<<~SQL)
        CREATE TEMP TABLE master_staging (isbn13 text, title text, authors text[], publisher text, published_on text, cover_url text) ON COMMIT DROP
      SQL
      copy(connection.raw_connection, path)
      connection.execute("DELETE FROM master_staging s USING edition_identifiers i WHERE i.scheme = 'isbn13' AND i.value = s.isbn13")
      connection.exec_update(<<~SQL)
        WITH staged AS MATERIALIZED (
          SELECT nextval('editions_id_seq') AS id, d.* FROM (SELECT DISTINCT ON (isbn13) * FROM master_staging ORDER BY isbn13) d
        ),
        inserted AS (
          INSERT INTO editions (id, title, authors, publisher, published_on, cover_url, created_at, updated_at)
          SELECT id, title, authors, publisher, published_on, cover_url, now(), now() FROM staged
        )
        INSERT INTO edition_identifiers (edition_id, scheme, value, created_at, updated_at)
        SELECT id, 'isbn13', isbn13, now(), now() FROM staged
      SQL
    end
    connection.execute("ANALYZE editions")
    connection.execute("ANALYZE edition_identifiers")
    @logger.info("inserted #{inserted} editions from #{path.basename}")
    inserted
  end

  private
    def verify!(path)
      actual = Digest::SHA256.file(path).hexdigest
      raise "sha256 mismatch for #{path}: expected #{@sha256}, got #{actual}" unless actual == @sha256
    end

    def copy(raw, path)
      encoder = PG::TextEncoder::Array.new
      raw.copy_data("COPY master_staging FROM STDIN WITH (FORMAT csv)") do
        Zlib::GzipReader.open(path, external_encoding: Encoding::UTF_8) do |gz|
          gz.each_line do |line|
            row = JSON.parse(line)
            raw.put_copy_data(CSV.generate_line([ row["isbn13"], row["title"], encoder.encode(row["authors"]).force_encoding(Encoding::UTF_8), row["publisher"], row["published_on"], row["cover_url"] ]))
          end
        end
      end
    end
end
