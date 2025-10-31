class IndexController < ApplicationController
  def show
    @metric = MetricSnapshot.last
  end
end
