module ApplicationHelper
  def metric_value_description(value)
    if value < -20
      "We never even started"
    elsif value < -10
      "It's joever"
    elsif value < 10
      "It's Chopped"
    elsif value < 20
      "We are so back"
    else
      "We've never been so back"
    end
  end

  def metric_chart_labels(metrics)
    metrics.map { |m| m.date.to_s }.to_json
  end

  def metric_chart_data(metrics)
    [
      { label: "Index", data: metrics.map { |m| m.value.to_f } },
      { label: "Bottom half", data: metrics.map { |m| m.bottom_half_value.to_f } },
      { label: "VIX", data: metrics.map { |m| m.vix_value.to_f } },
      { label: "NDX", data: metrics.map { |m| m.ndx_value.to_f } },
      { label: "BTC", data: metrics.map { |m| m.btc_value.to_f } }
    ]
  end
end
