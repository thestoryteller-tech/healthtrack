<?php
/**
 * Plugin Name: HealthTrack Pro
 * Plugin URI: https://healthtrack.io
 * Description: HIPAA-compliant tracking for healthcare websites. Safely use advertising platforms without exposing PHI.
 * Version: 1.0.0
 * Author: HealthTrack Pro
 * Author URI: https://healthtrack.io
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: healthtrack-pro
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('HEALTHTRACK_VERSION', '1.0.0');
define('HEALTHTRACK_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('HEALTHTRACK_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main HealthTrack Pro Plugin Class
 */
class HealthTrack_Pro {

    private static $instance = null;

    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'inject_tracking_script'));
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_settings_link'));
    }

    /**
     * Add settings page to admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'HealthTrack Pro Settings',
            'HealthTrack Pro',
            'manage_options',
            'healthtrack-pro',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('healthtrack_options', 'healthtrack_api_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));

        register_setting('healthtrack_options', 'healthtrack_enabled', array(
            'type' => 'boolean',
            'default' => true
        ));

        register_setting('healthtrack_options', 'healthtrack_server_url', array(
            'type' => 'string',
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'https://app.healthtrack.io/api/v1/events'
        ));

        register_setting('healthtrack_options', 'healthtrack_sensitive_patterns', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_textarea_field',
            'default' => implode("\n", array(
                '**/checkout/**',
                '**/cart/**',
                '**/my-account/**',
                '**/patient/**',
                '**/appointment/**',
                '**/intake/**',
                '**/medical/**',
                '**/health-form/**',
                '**/gf_page/**',
            ))
        ));

        register_setting('healthtrack_options', 'healthtrack_debug', array(
            'type' => 'boolean',
            'default' => false
        ));
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        // Check if settings were saved
        if (isset($_GET['settings-updated'])) {
            add_settings_error('healthtrack_messages', 'healthtrack_message', 'Settings saved.', 'updated');
        }

        settings_errors('healthtrack_messages');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

            <div style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ccd0d4; border-radius: 4px;">
                <h2 style="margin-top: 0;">HIPAA-Compliant Tracking</h2>
                <p>HealthTrack Pro automatically scrubs PHI (Protected Health Information) from your tracking events before sending them to advertising platforms like Google Analytics, Meta, TikTok, and LinkedIn.</p>
                <p><a href="https://app.healthtrack.io/dashboard" target="_blank">Open HealthTrack Dashboard</a> | <a href="https://app.healthtrack.io/dashboard/docs/sdk" target="_blank">View Documentation</a></p>
            </div>

            <form action="options.php" method="post">
                <?php
                settings_fields('healthtrack_options');
                ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row">
                            <label for="healthtrack_enabled">Enable Tracking</label>
                        </th>
                        <td>
                            <input type="checkbox" id="healthtrack_enabled" name="healthtrack_enabled" value="1" <?php checked(get_option('healthtrack_enabled', true)); ?> />
                            <p class="description">Uncheck to temporarily disable tracking without removing the plugin.</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="healthtrack_api_key">API Key</label>
                        </th>
                        <td>
                            <input type="text" id="healthtrack_api_key" name="healthtrack_api_key" value="<?php echo esc_attr(get_option('healthtrack_api_key')); ?>" class="regular-text" placeholder="ht_live_xxxxxxxxxxxxxxxx" />
                            <p class="description">
                                Your HealthTrack API key. <a href="https://app.healthtrack.io/dashboard/settings/api-keys" target="_blank">Get your API key</a>
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="healthtrack_server_url">Server URL</label>
                        </th>
                        <td>
                            <input type="url" id="healthtrack_server_url" name="healthtrack_server_url" value="<?php echo esc_attr(get_option('healthtrack_server_url', 'https://app.healthtrack.io/api/v1/events')); ?>" class="regular-text" />
                            <p class="description">Leave default unless you're self-hosting HealthTrack.</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="healthtrack_sensitive_patterns">Sensitive Page Patterns</label>
                        </th>
                        <td>
                            <textarea id="healthtrack_sensitive_patterns" name="healthtrack_sensitive_patterns" rows="10" class="large-text code"><?php echo esc_textarea(get_option('healthtrack_sensitive_patterns')); ?></textarea>
                            <p class="description">
                                URL patterns for pages with PHI (one per line). Uses glob syntax: ** matches any path, * matches single segment.<br>
                                Default patterns include WooCommerce checkout/cart, Gravity Forms, and common healthcare URLs.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="healthtrack_debug">Debug Mode</label>
                        </th>
                        <td>
                            <input type="checkbox" id="healthtrack_debug" name="healthtrack_debug" value="1" <?php checked(get_option('healthtrack_debug', false)); ?> />
                            <p class="description">Enable console logging for debugging. Disable in production.</p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save Settings'); ?>
            </form>

            <div style="background: #fef3cd; padding: 15px; margin: 20px 0; border: 1px solid #ffc107; border-radius: 4px;">
                <strong>WooCommerce Users:</strong> The default sensitive patterns automatically protect checkout, cart, and account pages. Make sure your payment forms are covered.
            </div>

            <div style="background: #d1ecf1; padding: 15px; margin: 20px 0; border: 1px solid #17a2b8; border-radius: 4px;">
                <strong>Gravity Forms Users:</strong> The pattern <code>**/gf_page/**</code> protects form submission pages. Add specific form URLs if needed.
            </div>
        </div>
        <?php
    }

    /**
     * Inject tracking script in footer
     */
    public function inject_tracking_script() {
        // Check if tracking is enabled
        if (!get_option('healthtrack_enabled', true)) {
            return;
        }

        // Check if API key is set
        $api_key = get_option('healthtrack_api_key');
        if (empty($api_key)) {
            return;
        }

        $server_url = get_option('healthtrack_server_url', 'https://app.healthtrack.io/api/v1/events');
        $debug = get_option('healthtrack_debug', false) ? 'true' : 'false';
        $sensitive_patterns = get_option('healthtrack_sensitive_patterns', '');
        $patterns_array = array_filter(array_map('trim', explode("\n", $sensitive_patterns)));
        $patterns_json = wp_json_encode($patterns_array);

        ?>
        <!-- HealthTrack Pro - HIPAA Compliant Tracking -->
        <script src="https://cdn.healthtrack.io/sdk/v1/healthtrack.min.js"></script>
        <script>
        (function() {
            HealthTrack.init({
                apiKey: '<?php echo esc_js($api_key); ?>',
                serverUrl: '<?php echo esc_js($server_url); ?>',
                debug: <?php echo $debug; ?>
            });

            // Configure sensitive page patterns
            var patterns = <?php echo $patterns_json; ?>;
            if (patterns && patterns.length > 0) {
                HealthTrack.configureSensitivePages(patterns);
            }
        })();
        </script>
        <!-- End HealthTrack Pro -->
        <?php
    }

    /**
     * Add settings link on plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="options-general.php?page=healthtrack-pro">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}

// Initialize plugin
HealthTrack_Pro::get_instance();

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Set default options on activation
    add_option('healthtrack_enabled', true);
    add_option('healthtrack_server_url', 'https://app.healthtrack.io/api/v1/events');
    add_option('healthtrack_sensitive_patterns', implode("\n", array(
        '**/checkout/**',
        '**/cart/**',
        '**/my-account/**',
        '**/patient/**',
        '**/appointment/**',
        '**/intake/**',
        '**/medical/**',
        '**/health-form/**',
        '**/gf_page/**',
    )));
});

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, function() {
    // Optionally clean up options on deactivation
    // We keep them so settings persist if reactivated
});
