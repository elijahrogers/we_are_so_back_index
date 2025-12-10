class MetricComputeJob < ApplicationJob
  queue_as :default

  # Store dates in the US timezone because trading days are specific to the US
  def perform(as_of: ActiveSupport::TimeZone["Pacific Time (US & Canada)"].today)
    payload = Metrics::SnapshotBuilder.new(as_of: as_of).call
    attributes = payload.compact
    return if attributes.empty?

    date = attributes[:date] || as_of
    snapshot = MetricSnapshot.find_or_initialize_by(date: date)
    snapshot.assign_attributes(attributes)
    snapshot.save!
  end
end
