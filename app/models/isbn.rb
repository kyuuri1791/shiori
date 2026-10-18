class Isbn
  attr_reader :isbn13

  def self.parse(value)
    digits = value.to_s.upcase.delete("^0-9X")
    case digits.length
    when 13 then new(digits) if valid_isbn13?(digits)
    when 10 then new(convert_isbn10(digits)) if valid_isbn10?(digits)
    end
  end

  def self.valid_isbn13?(digits)
    digits.match?(/\A97[89]\d{10}\z/) && check_digit(digits[0, 12]) == digits[12].to_i
  end

  def self.valid_isbn10?(digits)
    return false unless digits.match?(/\A\d{9}[\dX]\z/)
    digits.chars.each_with_index.sum { |c, i| (c == "X" ? 10 : c.to_i) * (10 - i) } % 11 == 0
  end

  def self.convert_isbn10(digits)
    base = "978#{digits[0, 9]}"
    "#{base}#{check_digit(base)}"
  end

  def self.check_digit(twelve_digits)
    (10 - twelve_digits.chars.each_with_index.sum { |c, i| c.to_i * (i.even? ? 1 : 3) } % 10) % 10
  end

  private_class_method :new, :valid_isbn13?, :valid_isbn10?, :convert_isbn10, :check_digit

  def initialize(isbn13)
    @isbn13 = isbn13
  end

  def to_s = isbn13

  def ==(other) = other.is_a?(Isbn) && other.isbn13 == isbn13
  alias eql? ==

  def hash = isbn13.hash
end
