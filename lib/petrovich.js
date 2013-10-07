(function(exports) {

  /**
   * Constructor
   * @param {String|Object} lastName   Either a last name of a person, an object with fields 'lastName', 'firstName' and 'middleName' (only argument), or gender (only argument)
   * @param {String}        firstName  First name, optional.
   * @param {String}        middleName Middle (patronymic) name, optional.
   * @param {String}        gender     Gender, optional. Can be derived from name if omitted.
   */
  var Petr = exports.Petrovich = function(lastName, firstName, middleName, gender) {
    if (lastName.constructor == String && arguments.length == 1) {
      this.gender = lastName;
    } else
    if (lastName.constructor != String) {
      this.lastName     = lastName.lastName;
      this.firstName    = lastName.firstName;
      this.middleName   = lastName.middleName;
      this.gender       = firstName || Petr.detectGender(lastName);
    } else {
      this.lastName     = lastName;
      this.firstName    = firstName;
      this.middleName   = middleName;
      this.gender       = firstName || Petr.detectGender(lastName, firstName, middleName);
    }
  }

  // Gender constants
  Petr.MALE             = 'male';
  Petr.FEMALE           = 'female';
  Petr.ANDROGYNOUS      = 'androgynous';

  // Case constants
  Petr.NOMINATIVE       = 'nominative';
  Petr.GENITIVE         = 'genitive';
  Petr.DATIVE           = 'dative';
  Petr.ACCUSATIVE       = 'accusative';
  Petr.INSTRUMENTAL     = 'instrumental';
  Petr.PREPOSITIONAL    = 'prepositional';
  Petr.CASES            = [ Petr.NOMINATIVE, Petr.GENITIVE, Petr.DATIVE, Petr.ACCUSATIVE, Petr.INSTRUMENTAL, Petr.PREPOSITIONAL ];

  /**
   * Detect gender from a name
   * @param  {String|Object}  lastName    Either a last name of a person or an object with fields 'lastName', 'firstName' and 'middleName' (only argument)
   * @param  {String}         firstName   First name, optional.
   * @param  {String}         middleName  Middle name, optional.
   * @return {String}         Returns the most probable gender of a person with given name
   */
  Petr.detectGender = function(lastName, firstName, middleName) {
    if (!lastName) {
      lastName = this;
    }

    if (lastName.constructor != String) {
      firstName = lastName.firstName;
      middleName = lastName.middleName;
      lastName = lastName.lastName;
    }

    // TODO: make more sophisticated
    if (middleName) {
      var suff = middleName.toLocaleLowerCase().substr(-2, 2);
      if (suff == 'ич') {
        return Petr.MALE;
      } else
      if (suff == 'на') {
        return Petr.FEMALE;
      } else {
        return Petr.ANDROGYNOUS;
      }
    } else {
      return Petr.ANDROGYNOUS;
    }
  }

  /**
   * Match current word tags against tags in rule
   * @param  {Object}                   tags        Map of word tags (for example, { 'first_word': true })
   * @param  {Array[String]}            ruleTags    Tags required for this rule to apply
   * @return {Boolean}                              Returns true if this rule can be applied
   */
  function tagsAllow(tags, ruleTags) {
    ruleTags = ruleTags || [];
    for (var i = 0; i < ruleTags.length; i++) {
      if (!tags[ruleTags[i]]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find first appropriate rule for this word
   * @param  {String}         name        The word to search a rule for
   * @param  {String}         gender      Gender of the word
   * @param  {Array[Object]}  rules       Rules array
   * @param  {Boolean}        wholeWord   Whether the whole word should be matched or only the suffix
   * @param  {Object}         tags        Word's tags
   * @return {Object|false}               Return first matching rule or false if none found
   */
  function find(name, gender, rules, wholeWord, tags) {
    name = name.toLocaleLowerCase();
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (tagsAllow(tags, rule.tags) && (rule.gender == Petr.ANDROGYNOUS || rule.gender == gender)) {
        for (var j = 0; j < rule.test) {
          var test = rule.test[j];
          if (test == (wholeWord ? name : name.substr(-test.length))) {
            return rule;
          }
        }
      }
    }
    return false;
  }

  /**
   * Find rule for word
   * @param  {String}         name        The word to search a rule for
   * @param  {String}         gender      Gender of the word
   * @param  {Object}         rules       Rules object
   * @param  {Object}         tags        Word's tags
   * @return {Object|false}               Return first matching rule or false if none found
   */
  function findFor(name, gender, rules, tags) {
    return (rules.exceptions && find(name, gender, rules.exceptions, true, tags)) || find(name, gender, rules.suffixes, false, tags);
  }


  var mods = { Petr.GENITIVE: 0, Petr.DATIVE: 1, Petr.ACCUSATIVE: 2, Petr.INSTRUMENTAL: 3, Petr.PREPOSITIONAL: 4 };
  /**
   * Choose a modificator for the chosen case
   * @param  {String} gcase The grammatical case
   * @param  {Object} rule  The rule to choose the modificator from
   * @return {String}       Returns the modificator
   */
  function modificatorFor(gcase, rule) {
    if (gcase == Petr.NOMINATIVE) {
      return '.';
    } else
    if (mods[gcase]) {
      return rule.mods[mods[gcase]];
    } else {
      throw new Error('Unknown grammatic case: ' + gcase);
    }
  }

  /**
   * Apply selected rule to the word
   * @param  {String} name  The word in nominative case
   * @param  {String} gcase The grammatical case
   * @param  {Object} rule  The rule
   * @return {String}       Returns the word inflected by this rule
   */
  function apply(name, gcase, rule) {
    var mod = modificatorFor(gcase, rule);
    for (var i = 0; i < mod.length; i++) {
      var ch = mod.charAt(i);
      if (ch == '-') {
        name = name.substr(0, name.length - 1); // TODO: improve performance here
      } else
      if (ch != '.') {
        name += ch;
      }
    }
    return name;
  }

  /**
   * Select most appropriate rule for the word and apply it
   * @param  {String} name   The word
   * @param  {String} gcase  The grammatical case
   * @param  {String} gender The gender of the word
   * @param  {Object} rules  Rules object
   * @param  {Object} tags   Word's tags
   * @return {String}        Returns inflected word
   */
  function findAndApply(name, gcase, gender, rules, tags) {
    var rule = findFor(name, gender, rules, tags);
    return rule ? apply(name, gcase, rule) : name;
  }

  /**
   * Inflect a name
   * @param  {String} name   First/last/middle name
   * @param  {String} gcase  The grammatical case
   * @param  {String} gender Gender of the person
   * @param  {Object} rules  Rules object
   * @return {String}        Returns inflected name
   */
  Petr.inflect = function(name, gcase, gender, rules) {
    var parts = name.split('-');
    for (var i = 0; i < parts.length; i++) {
      parts[i] = findAndApply(parts[i], gcase, gender, rules, { firstWord: (i == 0) && (parts.length > 1) });
    }
    return parts.join('-');
  }

  // Define lastName, firstName & middleName functions
  var funcNames = ['lastName', 'firstName', 'middleName'];
  for (var i = 0; i < funcNames.length; i++) {
    (function(funcName) {
      /**
       * Inflect a name
       * @param  {String} name   First/last/middle name or an object with fields 'lastName', 'firstName' and 'middleName' (optional if called on an object with this field filled)
       * @param  {String} gcase  The grammatical case (required)
       * @param  {String} gender Gender of the person (optional)
       * @return {String}        Returns inflected name
       */
      Petr[funcName] = function(name, gcase, gender) {
        if (this && this[funcName] && arguments.length < 3) {
          gcase = name;
          gender = gender || this.gender;
          name = this[funcName];
        } else {
          var nameObject = (name.constructor == String) ? {
            lastName: (funcName == 'lastName') && name,
            firstName: (funcName == 'firstName') && name,
            middleName: (funcName == 'middleName') && name
          } : name;
          gender = gender || (this && this.gender) || Petr.detectGender(nameObject);

          name = (name.constructor == String) ? name : name[funcName];
        }

        if (!Petr.rules) {
          throw new Error('Rules not found! Please include petrovich.rules.js');
        }

        return Petr.inflect(name, gcase, gender, Petr.rules[funcName.toLowerCase()]);
      }
    })(funcNames[i]);
  }
  Petr.patronymic = Petr.middleName;


  // Object methods (same as class methods, but name & gender is not required to pass)
  Petr.prototype = {
    lastName: Petr.lastName,
    firstName: Petr.firstName,
    middleName: Petr.middleName,
    patronymic: Petr.patronymic,
    detectGender: Petr.detectGender
  };

})(typeof exports === 'undefined' ? this['Petrovich'] = {} : exports);