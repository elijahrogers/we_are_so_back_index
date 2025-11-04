class IndexController < ApplicationController
  def show
    @metric = MetricSnapshot.last
    @metrics = MetricSnapshot.order(date: :desc).limit(30)
  end
end
