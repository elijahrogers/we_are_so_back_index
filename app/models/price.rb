# == Schema Information
#
# Table name: prices
#
#  id             :integer          not null, primary key
#  adjusted_close :decimal(12, 6)   not null
#  close          :decimal(12, 6)   not null
#  date           :date             not null
#  high           :decimal(12, 6)   not null
#  low            :decimal(12, 6)   not null
#  open           :decimal(12, 6)   not null
#  symbol         :string           not null
#  volume         :decimal(12, 6)   not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#
class Price < ApplicationRecord
end
