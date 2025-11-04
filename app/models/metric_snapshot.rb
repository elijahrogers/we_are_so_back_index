class MetricSnapshot < ApplicationRecord
  def value
    (bottom_half_value + vix_value + ndx_value + btc_value) * 25
  end

  def bottom_half_value
    bottom_half_advancers / 250.0
  end

  def vix_value
    1 - (vix_percentile / 100.0)
  end

  def ndx_value
    ndx_change_30d.to_f / 0.1
  end

  def btc_value
    btc_change_30d.to_f / 0.20
  end
end
