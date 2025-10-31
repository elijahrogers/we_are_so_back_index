class MetricSnapshot < ApplicationRecord
  def value
    ndx_change_30d.to_f + btc_change_30d.to_f - vix_percentile.to_f + bottom_half_advancers.to_f / 4.0
  end
end
