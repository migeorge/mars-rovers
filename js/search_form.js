var SearchForm = function(config, template_engine) {
  if (typeof config === 'undefined') {
    throw('Malformed Initialization Error: You must provide a config upon initialization of SearchForm');
  }
  if (typeof template_engine === 'undefined') {
    throw('Malformed Initialization Error: You must provide a template engine upon initialization of SearchForm');
  }

  this.state = {
    rovers: {}
  };

  this.config = config;
  this.template_engine = template_engine;
  this.populateRoverSelect();

  $('#rover-select').change(this.displayRoverOptions.bind(this));
  $('#search-reset').click(this.resetForm.bind(this));
};

SearchForm.prototype = {
  formLoading: function(isLoading) {
    if (isLoading) {
      $('.search.loading').removeClass('hidden');
      $('.search.loaded').addClass('hidden');
    } else {
      $('.search.loading > .spinning-cog').addClass('shrinking-cog');

      setTimeout(function() {
        $('.search.loading').addClass('hidden');
        $('.search.loading > .spinning-cog').removeClass('shrinking-cog');
        $('.search.loaded').removeClass('hidden');
      }, 400);
    }
  },

  populateRoverSelect: function() {
    this.formLoading(true);

    $.get(this.config.roversEndpoint(), function(data) {
      var rovers = data.rovers;

      for (var i = 0; i < rovers.length; i++) {
        var rover = rovers[i];

        var templateData = {
          name: rover.name
        };
        this.template_engine.appendAlongside('.rover-option', templateData);

        this.state.rovers[rover.name] = rover;
      }

      $('.rover-option.template').remove();

      this.formLoading(false);
    }.bind(this));
  },

  displayRoverOptions: function(e) {
    var rover = this.state.rovers[e.currentTarget.value];

    this.populateMetadata({
      landing_date: rover.landing_date,
      max_date: rover.max_date
    });
    this.populateCameraOptions(rover.cameras);

    $('.select-dependent').removeClass('hidden');
  },

  populateMetadata: function(meta) {
    $('#rover-landed').text(meta.landing_date);
    $('#rover-max-date').text(meta.max_date);
  },

  populateCameraOptions: function(cameras) {
    $('#camera-options > .checkbox:not(.template)').remove();

    for (var i = 0; i < cameras.length; i++) {
      var templateData = {
        'camera-slug': cameras[i].name,
        'camera-full-name': cameras[i].full_name
      };
      this.template_engine.appendAlongside('#camera-options > .checkbox.hidden', templateData);
    }
  },

  resetForm: function() {
    $('.search.loaded .checkbox input').each(function() {
      $(this).attr('checked', false);
    });

    $('#image-date').val('');
  }
};
