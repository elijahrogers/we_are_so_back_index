class MetricComputeJob < ApplicationJob
  queue_as :default

  def perform(as_of: Date.current)
    payload = Metrics::SnapshotBuilder.new(as_of: as_of).call
    attributes = payload.compact
    return if attributes.empty?

    MetricSnapshot.create!(attributes)
  rescue StandardError => error
    Rails.logger.error("Metric compute failed: #{error.message}")
    Rails.logger.error(attributes.to_json)
    raise
  end
end
