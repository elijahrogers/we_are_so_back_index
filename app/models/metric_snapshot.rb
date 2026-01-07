# == Schema Information
#
# Table name: metric_snapshots
#
#  id                    :integer          not null, primary key
#  bottom_half_advancers :integer
#  btc_change_30d        :decimal(8, 4)
#  date                  :date             not null
#  ndx_change_30d        :decimal(8, 4)
#  vix_percentile        :decimal(5, 2)
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#
# Indexes
#
#  index_metric_snapshots_on_date  (date) UNIQUE
#
class MetricSnapshot < ApplicationRecord
  def value
    (bottom_half_value + ndx_value + btc_value - vix_value) * 25
  end

  def bottom_half_value
    bottom_half_advancers / 250.0
  end

  def vix_value
    vix_percentile / 100.0
  end

  def ndx_value
    ndx_change_30d.to_f / 0.1
  end

  def btc_value
    btc_change_30d.to_f / 0.20
  end
end
