class CreatePrices < ActiveRecord::Migration[7.1]
  def change
    create_table :prices do |t|
      t.string :symbol, null: false
      t.date :date, null: false
      t.decimal :open, precision: 12, scale: 6, null: false
      t.decimal :high, precision: 12, scale: 6, null: false
      t.decimal :low, precision: 12, scale: 6, null: false
      t.decimal :close, precision: 12, scale: 6, null: false
      t.decimal :volume, precision: 12, scale: 6, null: false
      t.decimal :adjusted_close, precision: 12, scale: 6, null: false

      t.timestamps
    end
  end
end
