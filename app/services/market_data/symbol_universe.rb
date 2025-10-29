require "yaml"

module MarketData
  class SymbolUniverse
    INDEX_SYMBOLS = [ "^NDX", "^VIX", "BTC-USD" ].freeze

    class << self
      def all
        (INDEX_SYMBOLS + sp500_constituents).uniq
      end

      def index_symbols
        INDEX_SYMBOLS
      end

      def sp500_constituents
        @sp500_constituents ||= load_sp500_constituents
      end

      private

      def load_sp500_constituents
        path = Rails.root.join("config/data/sp500_constituents.yml")
        return [] unless File.exist?(path)

        Array(YAML.load_file(path)).map(&:to_s).map(&:upcase).uniq
      end
    end
  end
end
