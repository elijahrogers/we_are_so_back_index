class CreateMetricSnapshots < ActiveRecord::Migration[7.1]
  def change
    create_table :metric_snapshots do |t|
      t.decimal :ndx_change_30d, precision: 8, scale: 4
      t.decimal :btc_change_30d, precision: 8, scale: 4
      t.decimal :vix_percentile, precision: 5, scale: 2
      t.integer :bottom_half_advancers

      t.timestamps
    end
  end
end
