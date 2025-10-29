# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_29_120100) do
  create_table "metric_snapshots", force: :cascade do |t|
    t.decimal "ndx_change_30d", precision: 8, scale: 4
    t.decimal "btc_change_30d", precision: 8, scale: 4
    t.decimal "vix_percentile", precision: 5, scale: 2
    t.integer "bottom_half_advancers"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "prices", force: :cascade do |t|
    t.string "symbol", null: false
    t.date "date", null: false
    t.decimal "open", precision: 12, scale: 6, null: false
    t.decimal "high", precision: 12, scale: 6, null: false
    t.decimal "low", precision: 12, scale: 6, null: false
    t.decimal "close", precision: 12, scale: 6, null: false
    t.decimal "volume", precision: 12, scale: 6, null: false
    t.decimal "adjusted_close", precision: 12, scale: 6, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end
end
