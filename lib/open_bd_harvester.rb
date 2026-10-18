require "net/http"
require "zlib"
require "digest"

class OpenBdHarvester
  COVERAGE_URL = URI("https://api.openbd.jp/v1/coverage")
  GET_URL = URI("https://api.openbd.jp/v1/get")
  BATCH_SIZE = 1000
  MIN_INTERVAL = 1.0
  MAX_ATTEMPTS = 5
  USER_AGENT = "shiori-master-harvester/1.0".freeze

  def initialize(dir:, logger: Logger.new($stdout))
    @dir = Pathname(dir)
    @logger = logger
    @dir.mkpath
  end

  def run
    isbns = coverage
    batches = isbns.each_slice(BATCH_SIZE).to_a
    start = checkpoint
    @logger.info("coverage=#{isbns.size} batches=#{batches.size} resume_from=#{start}")
    last_request_at = nil

    File.open(records_path, "a") do |out|
      batches.each_with_index.drop(start).each do |batch, index|
        wait = last_request_at && MIN_INTERVAL - (monotonic_now - last_request_at)
        sleep(wait) if wait&.positive?
        last_request_at = monotonic_now
        fetch(batch).each { out.puts(JSON.generate(it)) }
        out.flush
        save_checkpoint(index + 1)
        @logger.info("batch #{index + 1}/#{batches.size}") if ((index + 1) % 50).zero? || index + 1 == batches.size
      end
    end
    package
  end

  private
    def coverage
      path = @dir.join("coverage.json")
      path.write(request(Net::HTTP::Get.new(COVERAGE_URL), COVERAGE_URL)) unless path.exist?
      JSON.parse(path.read).sort
    end

    def fetch(isbns)
      post = Net::HTTP::Post.new(GET_URL)
      post.set_form_data(isbn: isbns.join(","))
      JSON.parse(request(post, GET_URL)).filter_map { entry(it["summary"]) if it }
    end

    def request(req, uri)
      req["User-Agent"] = USER_AGENT
      attempts = 0
      begin
        attempts += 1
        response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 120) { it.request(req) }
        raise "HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)
        response.body.force_encoding(Encoding::UTF_8)
      rescue StandardError => e
        raise if attempts >= MAX_ATTEMPTS
        backoff = 2**attempts * 5
        @logger.warn("#{uri} failed (#{e.message}), retrying in #{backoff}s")
        sleep(backoff)
        retry
      end
    end

    def entry(summary)
      isbn = Isbn.parse(summary["isbn"]) or return
      title = [ summary["title"].to_s.sub(/\s+=\s+.*\z/, "").strip, summary["volume"].to_s.strip.presence ].compact_blank.join(" ")
      return if title.blank?

      {
        isbn13: isbn.to_s,
        title: title.first(1000),
        authors: person_names(summary["author"].to_s),
        publisher: summary["publisher"].to_s.strip.first(255).presence,
        published_on: published_on(summary["pubdate"]),
        cover_url: summary["cover"].to_s.strip.presence
      }
    end

    def person_names(text)
      text.split(/\s+/).filter_map do |name|
        parts = name.sub(%r{[／/].*\z}, "").split(",").reject { it.blank? || it.match?(/\A\d{4}-?\d{0,4}\z/) }
        next if parts.empty?
        parts.all? { it.match?(/\A[\p{Han}\p{Hiragana}\p{Katakana}ー・]+\z/) } ? parts.join : parts.join(" ")
      end.uniq.first(20)
    end

    def published_on(value)
      digits = value.to_s.delete("^0-9")
      [ digits[0, 4], digits[4, 2], digits[6, 2] ].compact_blank.join("-").presence
    end

    def package
      name = "openbd-editions-#{Date.current.strftime('%Y%m%d')}.ndjson.gz"
      path = @dir.join(name)
      seen = Set.new
      count = 0
      Zlib::GzipWriter.open(path) do |gz|
        File.foreach(records_path) do |line|
          isbn = line[/"isbn13":"(\d{13})"/, 1]
          next if isbn.nil? || !seen.add?(isbn)
          gz.write(line)
          count += 1
        end
      end
      digest = Digest::SHA256.file(path).hexdigest
      @logger.info("packaged #{count} books into #{path} sha256=#{digest}")
      { path:, count:, sha256: digest }
    end

    def records_path = @dir.join("records.ndjson")
    def checkpoint_path = @dir.join("checkpoint")
    def checkpoint = checkpoint_path.exist? ? checkpoint_path.read.to_i : 0
    def save_checkpoint(index) = checkpoint_path.write(index.to_s)
    def monotonic_now = Process.clock_gettime(Process::CLOCK_MONOTONIC)
end
