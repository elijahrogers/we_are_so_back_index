namespace :backfill do
  desc "Backfill metric snapshots for given date range"
  task :metric_snapshots, [ :date_range ] => :environment do |_, args|
    date_range = args[:date_range]&.strip

    # Parse date_range: YYYY-MM-DD..YYYY-MM-DD
    parts = date_range.split("..").map(&:strip)
    start_date = Date.parse(parts[0])
    end_date = Date.parse(parts[1])
    dates = (start_date..end_date).to_a

    puts "Enqueuing MetricComputeJob for #{start_date}..#{end_date}"

    dates.each do |date|
      MetricComputeJob.perform_later(as_of: date)
    end
  end
end
