var ResultSet = function(config, template_engine, target_form_container) {
  if (typeof config === 'undefined') {
    throw('Malformed Initialization Error: You must provide a config to ResultSet');
  }
  if (typeof target_form_container === 'undefined') {
    throw('Malformed Initialization Error: You must provide a target form container to ResultSet');
  }

  this.config = config;
  this.template_engine = template_engine;

  this.$results_container = $('.results.loaded');
  this.$results_container.on('click', '.photo', this.showImageModal.bind(this));

  this.$form_container = $(target_form_container);
  this.$form_container.on('change', 'select, input:not([type=text])',
                          this.constraintsUpdated.bind(this));
  this.$form_container.on('input', 'input[type=text]',
                          this.constraintsUpdated.bind(this));

  $('#search-reset').click(this.resetState.bind(this));
  $('.pager-prev').click(this.prevPage.bind(this));
  $('.pager-next').click(this.nextPage.bind(this));

  this.data_types = [
    'rover',
    'date',
    'camera'
  ];

  this.state = {
    rover: false,
    date: false,
    date_format: false,
    cameras: [],
    photos: [],
    page: 1,
    response_count: 0,
    expected_responses: 0
  };
};

ResultSet.prototype = {
  resultsLoading: function(isLoading) {
    if (isLoading) {
      $('.results.loading').removeClass('hidden');
      $('.results.loaded').addClass('hidden');
      $('.results.loaded .initial-state').addClass('hidden');
    } else {
      $('.results.loading > .spinning-cog').addClass('shrinking-cog');

      setTimeout(function() {
        $('.results.loading').addClass('hidden');
        $('.results.loading > .spinning-cog').removeClass('shrinking-cog');
        $('.results.loaded').removeClass('hidden');
      }.bind(this), 400);
    }
  },

  constraintsUpdated: function(e) {
    var stateKey = $(e.currentTarget).attr('data-state-key');
    var value    = e.currentTarget.value.trim();
    var action   = 'update';

    if (e.currentTarget.type === 'checkbox') {
      action = e.currentTarget.checked ? 'add' : 'remove';
      value  = e.currentTarget.id;
    }

    if (value === '') {
      action = 'remove';
    }

    if (typeof stateKey !== 'undefined') {
      if (this.data_types.indexOf(stateKey) > -1) {
        this.updateState(stateKey, value, action);
      } else {
        throw('Unsupported Field Error: Field with data-state-key: ' + stateKey + ' is not currently supported');
      }
    }
  },

  nextPage: function(e) {
    this.updateState('page', this.state.page + 1);
    e.preventDefault();
  },

  prevPage: function(e) {
    this.updateState('page', this.state.page - 1);
    e.preventDefault();
  },

  updateState: function(itemType, value, action) {
    if (typeof action === 'undefined') {
      action = 'update';
    }

    var arrayName = itemType + 's';

    if (this.state.hasOwnProperty(arrayName)) {
      // multiple values for this data type are stored in the state
      var itemArray = this.state[arrayName];

      if (action === 'add') {
        itemArray.push(value);
      } else {
        var itemIndex = itemArray.indexOf(value);

        if (itemIndex > -1) {
          itemArray.splice(itemIndex, 1);
        }
      }
    } else {
      // this data type exists in a singular form
      if (action === 'update') {
        this.state[itemType] = value;
      } else {
        this.state[itemType] = false;
      }
    }

    this.fireAPICalls();
  },

  fireAPICalls: function() {
    // in a bigger project this would not be my preferred method of validation,
    // since there are only three possible combinations here this should be okay

    var hasCameras = this.state.cameras.length > 0;

    if (this.state.rover && this.state.date && this.dateFormatValid() ||
        this.state.rover && hasCameras && !this.state.date ||
        this.state.rover && this.state.date && this.dateFormatValid() && hasCameras) {
      var getUrls = [];

      if (hasCameras) {
        var cameras = this.state.cameras;
        for (var i = 0; i < cameras.length; i++) {
          getUrls.push(this.buildPhotosGetUrl({ camera: cameras[i] }));
        }
      } else {
        getUrls.push(this.buildPhotosGetUrl());
      }

      this.resultsLoading(true);

      this.state.photos = [];
      this.state.response_count = 0;
      this.state.expected_responses = getUrls.length;

      for (var j = 0; j < getUrls.length; j++) {
        var url = getUrls[j];

        $.ajax({
          url: url,
          success: this.APISuccess.bind(this),
          error: this.APIError.bind(this)
        });
      }
    }
  },

  APISuccess: function(data) {
    this.incrementResponseCount();
    this.state.photos = this.state.photos.concat(data.photos);

    if (this.state.response_count === this.state.expected_responses) {
      this.renderResults();
    }
  },

  APIError: function(response) {
    this.incrementResponseCount();

    if (response.responseJSON.errors !== 'No Photos Found') {
      throw('API Access Error: Houston, We have a problem!');
    }

    if (this.state.response_count === this.state.expected_responses) {
      this.renderResults();
    }
  },

  incrementResponseCount: function() {
    this.state.response_count = this.state.response_count + 1;
  },

  renderResults: function() {
    var photos = this.state.photos;

    $('.results.loaded .photo:not(.template)').remove();
    $('.results.loaded .no-results').addClass('hidden');

    if (photos.length < 1) {
      $('.results.loaded .no-results').removeClass('hidden');
    } else {
      for (var i = 0; i < photos.length; i++) {
        var photo = this.state.photos[i];
        var photo_tag = '<img src="' + photo.img_src + '" />';

        var templateData = {
          'photo-tag': photo_tag,
          'photo-metadata': photo.camera.full_name
        };
        this.template_engine.appendAlongside('.results.loaded .photo', templateData);
      }
    }

    if (photos.length >= 25 || this.state.page !== 1) {
      $('.pager.hidden').removeClass('hidden');
      $('.pager .pager-prev').removeClass('hidden');
      $('.pager .pager-next').removeClass('hidden');

      if (this.state.page === 1) {
        $('.pager .pager-prev').addClass('hidden');
      }
      if (photos.length < 25) {
        $('.pager .pager-next').addClass('hidden');
      }
    } else {
      $('.pager').addClass('hidden');
    }

    this.resultsLoading(false);
  },

  buildPhotosGetUrl: function(options) {
    var photosEndpoint = this.config.roverPhotosEndpoint(this.state.rover);
    var getParams      = '';

    if (this.state.date_format && this.state.date) {
      var param = this.state.date_format;

      getParams += '&' + param + '=' + this.state.date;
    }

    getParams += '&page=' + this.state.page;

    if (typeof options !== 'undefined') {
      if (options.hasOwnProperty('camera')) {
        getParams += '&camera=' + options.camera;
      }
    }

    return photosEndpoint + getParams;
  },

  dateFormatValid: function() {
    var earthDateFormat = /^\d{4}-\d{2}-\d{2}$/;
    var solFormat       = /^\d+$/;

    var validEarthDate = earthDateFormat.test(this.state.date);
    var validSol       = solFormat.test(this.state.date);

    if (validEarthDate || validSol) {
      this.state.date_format = validSol ? 'sol' : 'earth_date';
      return true;
    }
    return false;
  },

  showImageModal: function(e) {
    var $thumbnail = $(e.currentTarget).find('img');
    var $modal_photo = $('#photo-modal').find('img');

    $modal_photo.get(0).onload = function() {
      var viewport_width = window.innerWidth;
      var modal_width = this.width + 50;
      var target_width = this.width;

      if (viewport_width < modal_width) {
        $modal_photo.width(viewport_width - 90);
        target_width = $modal_photo.width();
      }

      $('#photo-modal .mg-modal-content').width(target_width);
      $('#photo-modal').removeClass('hidden');
    };

    $('#photo-modal').find('img').attr('src', $thumbnail.attr('src'));
  },

  resetState: function() {
    this.state.date = false;
    this.state.date_format = false;
    this.state.photos = [];
    this.state.page = 1;
    this.renderResults();
  }
};
