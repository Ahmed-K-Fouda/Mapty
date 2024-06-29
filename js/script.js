'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btn = document.querySelector('.btn-clear');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January','February','March','April','May','June','July','August',
'September','October','November','December',];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } at ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

//######################//
// App archtecture
class App {
  #map;
  #mapZoomLevel;
  #mapEvent;
  #workoutsArr = [];
  constructor() {
    // get local storge
    this._getLocalStorage();
    // delete local storage
    this._controllBtn();
    // get current position
    this._getPosition();

    // attach handler
    form.addEventListener('submit', this._newWorkOut.bind(this));
    inputType.addEventListener('change', this._toggleElevField);
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('could not get your position');
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], 13);
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workoutsArr.forEach(work => this._renderWorkoutMarkup(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    btn.style.display = 'block';
  }

  _hideForm() {
    // hide form + clear inputs field
    form.computedStyleMap.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    inputCadence.blur();
  }

  _controllBtn() {
    btn.addEventListener('click', function () {
      localStorage.removeItem('workouts');
      location.reload();
    });
  }

  _toggleElevField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkOut(e) {
    const checkInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) =>
      inputs.every(inp => (inp < 0 ? false : true));
    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // check if the workout is running
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //   check if the data valid
      if (
        !checkInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence) ||
        !distance ||
        !duration ||
        !cadence
      )
        return alert('inputs Have to be Positive Number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // check if the workout is cycling
    if (type === 'cycling') {
      const elevGain = Number(inputElevation.value);

      if (
        !checkInputs(distance, duration, elevGain) ||
        !allPositive(distance, duration) ||
        !distance ||
        !duration ||
        !elevGain
      )
        return alert('inputs Have to be Positive Number');
      workout = new Cycling([lat, lng], distance, duration, elevGain);
    }
    this.#workoutsArr.push(workout);
    //   display input marker
    this._renderWorkoutMarkup(workout);

    // render workout on ul
    this._renderWorkout(workout);
    // hide form+clear inputs
    this._hideForm();
    // set local storage
    this._setLocalStorage();
  }
  _renderWorkoutMarkup(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          maxWidth: 250,
          maxHeight: 100,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
 <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}></h2>
  <div class="workout__details">
    <span class="workout__icon">${
      workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    }</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
  </div>
  <div class="workout__details">  
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
  </div>
`;
    if (workout.type === 'running')
      html += `
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
  </div>
`;

    if (workout.type === 'cycling')
      html += `
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">🌄</span>
    <span class="workout__value">${workout.elevGain}</span>
    <span class="workout__unit">m</span>
  </div>
`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(e) {
    const close = e.target.closest('.workout');
    if (!close) return;
    const workOut = this.#workoutsArr.find(
      work => work.id === close.dataset.id
    );

    this.#map.setView(workOut.coords, 13, {
      animate: true,
      pan: {
        duration: 1.5,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workoutsArr));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workoutsArr = data;
    this.#workoutsArr.forEach(work => this._renderWorkout(work));
  }
}

const app = new App();
