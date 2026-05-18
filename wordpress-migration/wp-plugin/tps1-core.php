<?php
/**
 * Plugin Name: TPS1 Core
 * Description: Registers custom post types and taxonomies for Thuc Pham So Mot.
 * Version: 0.1.0
 * Author: TPS1
 */

if (!defined('ABSPATH')) {
  exit;
}

function tps1_register_post_types() {
  $cpts = array(
    'product' => array(
      'label' => 'Sản phẩm',
      'singular' => 'Sản phẩm',
      'slug' => 'san-pham',
    ),
    'news' => array(
      'label' => 'Tin tức',
      'singular' => 'Tin tức',
      'slug' => 'tin-tuc',
    ),
    'knowledge' => array(
      'label' => 'Kiến thức',
      'singular' => 'Kiến thức',
      'slug' => 'kien-thuc',
    ),
    'industry' => array(
      'label' => 'Ngành hàng',
      'singular' => 'Ngành hàng',
      'slug' => 'nganh-hang',
    ),
    'service' => array(
      'label' => 'Dịch vụ',
      'singular' => 'Dịch vụ',
      'slug' => 'dich-vu',
    ),
    'policy' => array(
      'label' => 'Chính sách',
      'singular' => 'Chính sách',
      'slug' => 'chinh-sach',
    ),
  );

  foreach ($cpts as $type => $config) {
    register_post_type($type, array(
      'labels' => array(
        'name' => $config['label'],
        'singular_name' => $config['singular'],
        'add_new_item' => 'Thêm ' . $config['singular'],
        'edit_item' => 'Sửa ' . $config['singular'],
        'new_item' => 'Bài ' . $config['singular'] . ' mới',
        'view_item' => 'Xem ' . $config['singular'],
        'search_items' => 'Tìm ' . $config['singular'],
      ),
      'public' => true,
      'show_in_rest' => true,
      'has_archive' => true,
      'menu_position' => 20,
      'menu_icon' => 'dashicons-portfolio',
      'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields'),
      'rewrite' => array('slug' => $config['slug'], 'with_front' => false),
      'taxonomies' => array($type . '_category'),
    ));
  }
}
add_action('init', 'tps1_register_post_types');

function tps1_register_taxonomies() {
  $taxonomies = array(
    'product_category' => array('label' => 'Danh mục sản phẩm', 'post_type' => 'product', 'slug' => 'danh-muc-san-pham'),
    'news_category' => array('label' => 'Danh mục tin tức', 'post_type' => 'news', 'slug' => 'danh-muc-tin-tuc'),
    'knowledge_category' => array('label' => 'Danh mục kiến thức', 'post_type' => 'knowledge', 'slug' => 'danh-muc-kien-thuc'),
    'industry_category' => array('label' => 'Danh mục ngành hàng', 'post_type' => 'industry', 'slug' => 'danh-muc-nganh-hang'),
    'service_category' => array('label' => 'Danh mục dịch vụ', 'post_type' => 'service', 'slug' => 'danh-muc-dich-vu'),
    'policy_category' => array('label' => 'Danh mục chính sách', 'post_type' => 'policy', 'slug' => 'danh-muc-chinh-sach'),
  );

  foreach ($taxonomies as $taxonomy => $config) {
    register_taxonomy($taxonomy, array($config['post_type']), array(
      'labels' => array(
        'name' => $config['label'],
        'singular_name' => $config['label'],
      ),
      'public' => true,
      'show_in_rest' => true,
      'hierarchical' => true,
      'rewrite' => array('slug' => $config['slug'], 'with_front' => false),
    ));
  }
}
add_action('init', 'tps1_register_taxonomies');

function tps1_flush_rewrite_rules() {
  tps1_register_post_types();
  tps1_register_taxonomies();
  flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'tps1_flush_rewrite_rules');
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

