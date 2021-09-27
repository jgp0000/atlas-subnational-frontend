import Ember from 'ember';
import ENV from '../../config/environment';

const {apiURL} = ENV;
const {RSVP, computed, $, set, get, copy} = Ember;

export default Ember.Route.extend({
  i18n: Ember.inject.service(),
  featureToggle: Ember.inject.service(),

  firstYear: computed.alias('featureToggle.first_year'),
  lastYear: computed.alias('featureToggle.last_year'),
  queryParams: {
    startDate: { refreshModel: false },
    endDate: { refreshModel: false },
    search: { refreshModel: false },
    toolTips: { refreshModel: false },
  },
  controllerName: 'visualization',
  renderTemplate() {
    this.render('visualization');
  },
  model(params) {
    let {industry_id, visualization_type, source_type, variable} = params;
    set(this, 'industry_id', industry_id);
    set(this, 'source_type', source_type);
    set(this, 'visualization_type', visualization_type);
    set(this, 'variable', variable);


    return RSVP.hash(this.get(source_type)).then((hash) => {
      if(source_type === 'departments') {
        return this.departmentDataMunging(hash);
      } else if (source_type === 'occupations') {
        return this.occupationsDataMunging(hash);
      } else if (source_type === 'cities') {
        return this.citiesDataMunging(hash);
      }
    });
  },
  afterModel(graphbuilderModel) {
    return graphbuilderModel.setProperties({
      entity_type:'industry',
      visualization: get(this, 'visualization_type'),
      source: get(this, 'source_type'),
      metaData: this.modelFor('application'),
      variable: get(this, 'variable')
    });
  },
  departments: computed('industry_id', function() {
    let id = get(this, 'industry_id');
    return {
      model: this.store.find('industry', id),
      departments: $.getJSON(`${apiURL}/data/industry/${id}/participants?level=department`),
      cities: $.getJSON(`${apiURL}/data/industry/${id}/participants/?level=msa`)
    };
  }),
  occupations: computed('industry_id', function() {
    let id = get(this, 'industry_id');
    return {
      model: this.store.find('industry', id),
      occupations: $.getJSON(`${apiURL}/data/industry/${id}/occupations/?level=minor_group`)
    };
  }),
  cities: computed('industry_id', function() {
    let id = get(this, 'industry_id');
    return {
      model: this.store.find('industry', id),
      cities: $.getJSON(`${apiURL}/data/industry/${id}/participants/?level=msa`)
    };
  }),

  departmentDataMunging(hash) {
    let {model, departments, cities} = hash;
    let locationsMetadata = this.modelFor('application').locations;

    let data = _.map(departments.data, (d) => {
      let industry = locationsMetadata[d.department_id];
      d.avg_wage =  d.wages/d.employment;
      d.name_short_en = industry.name_short_en;
      d.name_short_es = industry.name_short_es;
      d.color = industry.color;
      d.code = industry.code;
      d.group = industry.group;
      d.model = 'location';
      d.id = d.department_id;
      return copy(d);
    });

    let datas = _.map(cities.data, (d) => {
      let industry = locationsMetadata[d.msa_id];
      d.avg_wage =  d.wages/d.employment;
      d.name_short_en = industry.name_short_en;
      d.name_short_es = industry.name_short_es;
      d.color = industry.color;
      d.code = industry.code;
      d.group = industry.group;
      d.model = 'location';
      d.id = d.msa_id;
      d.parent_name_en = locationsMetadata[industry.parent_id].name_short_en;
      d.parent_name_es = locationsMetadata[industry.parent_id].name_short_es;
      d.parent_code = locationsMetadata[locationsMetadata[d.msa_id].parent_id].code;
      return copy(d);
    });

    return Ember.Object.create({
      entity: model,
      data: data,
      cities:datas
    });
  },
  occupationsDataMunging(hash) {
    let {model, occupations} = hash;
    let occupationsMetadata = this.modelFor('application').occupations;

    let occupationVacanciesSum = 0;
    let data = _.map(occupations.data, (d) => {
      let occupation = get(occupationsMetadata, `${d.occupation_id}`);
      let parent =  get(occupationsMetadata, `${occupation.parent_id}`) || occupation;
      occupationVacanciesSum += d.num_vacancies;
      d.year = this.get('featureToggle.year_ranges.occupation.last_year');
      d.group = get(parent, 'code');

      d.parent_name_en = get(parent,'name_en');
      d.parent_name_es = get(parent,'name_es');

      d.avg_wage = d.wages/d.employment;
      d.name_short_en = occupation.name_short_en;
      d.name_short_es = occupation.name_short_es;
      d.color = occupation.color;
      d.code = occupation.code;
      d.model = null;
      return copy(d);
    });

    data.forEach((d) => {
      d.share = d.num_vacancies/occupationVacanciesSum;
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  citiesDataMunging(hash) {
    let {model, cities} = hash;
    let locationsMetadata = this.modelFor('application').locations;

    let data = _.map(cities.data, (d) => {
      let industry = locationsMetadata[d.msa_id];
      d.avg_wage =  d.wages/d.employment;
      d.name_short_en = industry.name_short_en;
      d.name_short_es = industry.name_short_es;
      d.color = industry.color;
      d.code = industry.code;
      d.group = industry.group;
      d.model = 'location';
      d.id = d.msa_id;
      d.parent_name_en = locationsMetadata[industry.parent_id].name_short_en;
      d.parent_name_es = locationsMetadata[industry.parent_id].name_short_es;
      return copy(d);
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  setupController(controller, model) {
    this._super(controller, model);
    controller.set('drawerChangeGraphIsOpen', false); // Turn off other drawers
    controller.set('drawerQuestionsIsOpen', false); // Turn off other drawers
    controller.set('searchText', controller.get('search'));
  },
  resetController(controller, isExiting) {
    controller.set('variable', null);

    if (isExiting) {
      controller.setProperties({
        startDate: this.get('firstYear'),
        endDate: this.get('lastYear')
      });
    }
  }
});

