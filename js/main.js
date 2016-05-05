$(document).ready(function() {
  var config = new Config();
  var template_engine = new TemplateEngine();

  new SearchForm(config, template_engine);
  new ResultSet(config, template_engine, '.search.loaded');

  $('#photo-modal .mg-modal-close').click(function() {
    $('#photo-modal').addClass('hidden');
  });
});
