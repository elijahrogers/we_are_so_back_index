class MetricComputeJob < ApplicationJob
  queue_as :default

  def perform(as_of: Date.current)
    payload = Metrics::SnapshotBuilder.new(as_of: as_of).call
    attributes = payload.compact
    return if attributes.empty?

    date = attributes[:date] || as_of
    snapshot = MetricSnapshot.find_or_initialize_by(date: date)
    snapshot.assign_attributes(attributes)
    snapshot.save!
  end
end
