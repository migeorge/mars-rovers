var Config = function() {
  this.API_ENDPOINT = 'https://api.nasa.gov/mars-photos/api/v1';
  this.API_KEY = 'DEMO_KEY';
};

Config.prototype = {
  keyParam: function() {
    return '?api_key=' + this.API_KEY;
  },

  roversEndpoint: function() {
    return this.API_ENDPOINT + '/rovers' + this.keyParam();
  },

  roverPhotosEndpoint: function(roverName) {
    roverName = roverName.toLowerCase();
    return this.API_ENDPOINT + '/rovers/' + roverName + '/photos' + this.keyParam();
  }
};
