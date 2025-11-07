class IndexController < ApplicationController
  def show
    @metric = MetricSnapshot.second_to_last
    @metrics = MetricSnapshot.order(date: :desc).limit(30)
  end
end
