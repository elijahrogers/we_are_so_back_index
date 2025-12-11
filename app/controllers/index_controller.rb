class IndexController < ApplicationController
  def show
    @metrics = MetricSnapshot.order(date: :desc).limit(30).reverse
    @metric = @metrics.last
  end
end
