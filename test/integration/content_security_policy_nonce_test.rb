require "test_helper"

class ContentSecurityPolicyNonceTest < ActionDispatch::IntegrationTest
  setup do
    @previous_forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = true
  end

  teardown do
    ActionController::Base.allow_forgery_protection = @previous_forgery_protection
  end

  test "first visit includes a content security policy nonce that matches the importmap scripts" do
    get root_path

    nonce = csp_nonce

    assert_match(/\A[0-9a-f]{32}\z/, nonce)
    assert_select "script[type=importmap][nonce=?]", nonce
    assert_select "script[type=module][nonce=?]", nonce
  end

  test "the following request keeps a nonce that matches the importmap scripts" do
    get root_path
    get root_path

    nonce = csp_nonce

    assert_match(/\A[0-9a-f]{32}\z/, nonce)
    assert_select "script[type=importmap][nonce=?]", nonce
    assert_select "script[type=module][nonce=?]", nonce
  end

  private
    def csp_nonce
      policy = response.headers["Content-Security-Policy"].to_s
      policy[/script-src[^;]*'nonce-([^']*)'/, 1].to_s
    end
end
