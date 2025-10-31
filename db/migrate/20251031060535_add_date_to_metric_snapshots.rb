class AddDateToMetricSnapshots < ActiveRecord::Migration[8.0]
  def change
    add_column :metric_snapshots, :date, :date, null: false
    add_index :metric_snapshots, :date, unique: true
  end
end
