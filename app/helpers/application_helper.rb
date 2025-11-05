module ApplicationHelper
  def metric_value_description(value)
    if value < -20
      "We never even started"
    elsif value < -10
      "It's joever"
    elsif value < 0
      "Chopped"
    elsif value < 10
      "Cooking"
    elsif value < 20
      "We are so back"
    else
      "We've never been so back"
    end
  end
end
