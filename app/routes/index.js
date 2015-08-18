import Ember from 'ember';

export default Ember.Route.extend({
  setupController(controller, model) {
    this._super(controller, model);
    controller.set('query', null); // Turn off other drawers
  },
  resetController: function (controller, isExiting) {
    if(isExiting) {
      controller.set('query', null); // Turn off other drawers
    }
  }
});
