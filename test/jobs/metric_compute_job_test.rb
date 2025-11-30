require "test_helper"

class MetricComputeJobTest < ActiveJob::TestCase
  describe "#perform" do
    before do
      Price.delete_all
      MetricSnapshot.delete_all
    end

    after do
      Price.delete_all
      MetricSnapshot.delete_all
    end

    let(:stubbed_builder) do
      stub(call: {
        date: Date.current,
        ndx_change_30d: 0.1,
        btc_change_30d: 0.2,
        vix_percentile: 50,
        bottom_half_advancers: 10
      })
    end

    it "computes metrics for the current date by default" do
      Metrics::SnapshotBuilder.stubs(:new).returns(stubbed_builder)

      MetricComputeJob.perform_now

      assert_equal 1, MetricSnapshot.count
      assert_equal 0.1, MetricSnapshot.last.ndx_change_30d
    end

    describe "when an existing snapshot exists for the given date" do
      let(:date) { Date.current - rand(1..100).days }
      let(:stubbed_builder) do
        stub(call: {
          date: date,
          ndx_change_30d: 0.15,
          btc_change_30d: 0.2,
          vix_percentile: 50,
          bottom_half_advancers: 10
        })
      end

      before do
        MetricSnapshot.create!(
          date: date,
          ndx_change_30d: 0.1,
          btc_change_30d: 0.2,
          vix_percentile: 50,
          bottom_half_advancers: 10
        )
      end

      it "updates existing metrics" do
        Metrics::SnapshotBuilder.stubs(:new).returns(stubbed_builder)

        MetricComputeJob.perform_now(as_of: date)

        assert_equal 1, MetricSnapshot.count
        assert_equal 0.15, MetricSnapshot.last.ndx_change_30d
      end
    end
  end
end
