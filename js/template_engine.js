var TemplateEngine = function() {
  this.template_format = /{{.+}}/g;
};

TemplateEngine.prototype = {
  appendAlongside: function(target, data) {
    var $parent     = $(target).first().parent();
    var template    = $(target)[0].outerHTML;
    var element_str = this.replaceTemplates(template, data);

    $parent.append($(element_str).removeClass('hidden template'));
  },

  replaceTemplates: function(template, data) {
    var matches = template.match(this.template_format);

    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      var key = match.substr(2, match.length - 4);

      template = template.replace(match, data[key]);
    }

    return template;
  }
};
