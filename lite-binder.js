// The MIT License (MIT)
// Copyright (c) 2012 <copyright holders>

// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, 
// distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to 
// the following conditions:

// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


/** Special thanks to Stefan Gabos for providing the jQuery Plugin Boilerplate v1.1 used to create this plugin **/
/**	(http://stefangabos.ro/jquery/jquery-plugin-boilerplate-revisited/) 									   **/

/*
 * Lite-Binder
 * Automatically update or send data to/from matching DOM elements
 * by Mike Cluck 2012
 * 
 * Get/Set data format:
 * {
 * 		name_of_element : value,
 *		another_element: another_value,
 * 		...
 * }
 * Format for source array/object:
 * {
 * 		name_of_element : {
 * 			actual_value : display_value
 * 		},
 *		another_element : {
 *			next_value : next_display
 * 		},
 *		...
 * }
 */
(function($) {

	$.liteBinder = function(element, options) {

		// plugin's default options
		// this is private property and is accessible only from inside the plugin
		var defaults = {
			getURL: '', 				// Used when updating the views
			setURL: '',					// Used when sending the views data to the server
			source: null,           	// Source for lookups. Can be an array or a URL which would produce the array
			key: 'name',				// Key to search for when get/setting views
			type: 'GET',				// Type of requests to make
			viewSelector: '',   		// Selector used for collecting the views.
											// DO NOT append the selector with the key, this is automatically added
			views: $(),  				// Elements to update, overridden if viewSelector is set
			arguments: [],				// Arguments to append to 'get'
			getOnInit: true,			// If true, get will be called on initialization
			setInputsOnly: true,		// If true, only input fields (input, select, etc.) will be used when 'set'ting data
			autoRefresh: false, 		// If true, views will be refreshed on every get/set
			useURISegments: false,		// If true, 'get' statements will be altered to use URI segments
			trueDisplay: 'True',    	// Value for true when a checkbox is converted to display only
			falseDisplay: 'False',  	// Value for false when a checkbox is converted to display only
			onGet: function() {},		// Fired after each 'get' function call
			onSet: function() {},		// Fired after each 'set' function call
			onRefresh: function() {}	// Fired after each 'refresh'
		}

		// to avoid confusions, use "base" to reference the
		// current instance of the object
		var base = this;

		// this will hold the merged default, and user-provided options
		base.settings = {}

		var $element = $(element), // reference to the jQuery version of DOM
									// element
		element = element; // reference to the actual DOM element

		// Initializes
		var init = function() {
			// the plugin's final properties are with the merged default and
			// user-provided options (if any)
			base.settings = $.extend( {}, defaults, options);
			
			// Collect all of the views based on the selector
			if(base.settings.viewSelector.length > 0) {
				var selector = base.settings.viewSelector.replace(',', '[' + base.settings.key + '],');
				if(selector[selector.length - 1] != '[')
					selector += '[' + base.settings.key + ']';
				base.settings.views = $element.find(selector);
			}
			
			// If a source URL has been set, retrieve the source
			base.getSources();
			
			// Update the views
			if(base.settings.views.length > 0 && base.settings.getOnInit)
				base.get();
		}
		
		// Fills in the source with the given URL
		base.getSources = function() {
			if(typeof base.settings.source == 'string') {
				$.ajax({
					url: base.settings.source,
					dataType: 'json',
					success: function(sourceArray) {
						if(sourceArray.length > 0) {
							base.settings.source = sourceArray;
						}
					}
				});
			}
		}
		
		/*
		 * Refresh
		 * Updates the set of views
		 * Only effective if the 'viewSelector' is set
		 */
		base.refresh = function() {
			if(base.settings.viewSelector.length > 0) {
				var selector = base.settings.viewSelector.replace(',', '[' + base.settings.key + '],');
				if(selector[selector.length - 1] != '[')
					selector += '[' + base.settings.key + ']';
				base.settings.views = $element.find(selector);
			}
			
			// Call the onRefresh event handler
			base.onRefresh();
		}
		
		/*
		 * Get
		 * Sends an AJAX request to the 'getURL' and updates the views using the response
		 * Response must be formatted as such:
		 * {
		 * 		name_of_element : value,
		 * 		...
		 * }
		 * The key corresponds to the key set in the DOM element of the view
		 * Optional: Set a new 'getURL' when calling the function
		 */
		base.get = function(newGetURL) {
			// If a new getURL was given, set it
			if(typeof newGetURL == 'string')
				base.settings.getURL = newGetURL;
		
			// If set, update the current view selection
			if(base.settings.autoRefresh)
				base.refresh();
			
			// Get the set of sources if available
			base.getSources();
			
			// If using useURISegments, format the argument list and append to the 'getURL'
			var argumentString = "";
			if(base.settings.useURISegments) {
				for(var i = 0; i < base.settings.arguments.length; i++) {
					argumentString += base.settings.arguments[i] + '/';
				}
			}
			else {
				// Otherwise, generate a standard data string
				for(var i = 0; i < base.settings.arguments.length; i++) {
					argumentString += base.settings.arguments[i][0] + '=' + base.settings.arguments[i][1];
					if(i < base.settings.arguments.length - 1)
						argumentString += '&';
				}
			}
			
			// Process the AJAX request
			$.ajax({
				url: (base.settings.useURISegments && base.settings.type.toUpperCase() == 'GET') ? base.settings.getURL + '/' + argumentString : base.settings.getURL,
				type: base.settings.type,
				dataType: 'json',
				data: (!base.settings.useURISegments) ? argumentString : '',
				success: function(viewUpdates) {
					if(viewUpdates != null) {
						// Update the views
						for(var viewKey in viewUpdates) {
							var element = base.settings.views.filter('[' + base.settings.key + '=' + viewKey + ']');
							if(typeof element !== 'undefined') {
								if(element.is(':input')) {
									if(element.is('select') && typeof base.settings.source[viewKey] != undefined) { // Dropdown
										var selectedValue = base.settings.source[viewKey][viewUpdates[viewKey]];
										element.children('option[value=' + selectedValue + ']').attr('selected', 'selected');
									}
									else if(element.is('input[type=checkbox]')) {
										if(viewUpdates[viewKey] && viewUpdates[viewKey] != 0 && viewUpdates[viewKey].toUpperCase() != 'FALSE')
											element.attr('checked', 'checked');
										else
											element.removeAttr('checked');
									}
									else if(element.is('input[type=radio]')) {
										element.filter('[value=' + viewUpdates[viewKey] + ']').attr('selected', 'selected');
									}
									else
										element.val(viewUpdates[viewKey]);
								}
								else {
									if(element.hasClass('edit-checkbox'))
										element.html( (viewUpdates[viewKey] && viewUpdates[viewKey].toUpperCase() != 'FALSE') ? base.settings.trueDisplay : base.settings.falseDisplay );
									else
										element.html(viewUpdates[viewKey]);
								}
							}
						}
					}
					
					// Fire the 'onGet' event handler
					base.settings.onGet(viewUpdates);
				}
			});
		}
		
		/*
		 * Set
		 * Sends all of the data currently in the views to the 'setURL'
		 * The data is formatted the same as the 'get' function:
		 * {
		 * 		name_of_element : value,
		 * 		...
		 * }
		 * Optional: Set a new 'setURL' when calling the function
		 */
		base.set = function(newSetURL) {
			// If the new setURL was given, set it
			if(typeof newSetURL == 'string')
				base.settings.setURL = newSetURL;
				
			// If set, update the view selection
			if(base.settings.autoRefresh)
				base.refresh();
			
			// Generate an array of objects to pass along
			var postObject = {};
			var postSet = (base.settings.setInputsOnly) ? base.settings.views.filter(':input') : base.settings.views;
			postSet.each(function() {
				var self = $(this);
				// Verify that the view contains the required key
				var hasKey = (typeof self.attr(base.settings.key) !== 'undefined' && self.attr(base.settings.key) !== false);
				if(hasKey) {
					postObject[self.attr(base.settings.key)] = (base.settings.type.toUpperCase() == 'GET') ? encodeURIComponent(self.val()) ? self.val();
				}
			});
			
			// Send off the ajax call
			$.ajax({
				url: base.settings.setURL,
				type: base.settings.type,
				dataType: 'json',
				data: postObject,
				success: function(response) {
					// Fire the 'onSet' event handler
					base.settings.onSet(response);
				}
			});
		}
		
		/*
		 * SetEditMode
		 * Argument: elements - Accepts none or NULL for all elements, a string selector, or a subset of elements
		 * Sets all of the given elements in the set to edit mode.
		 * Elements with a matching entry in the 'source' array by default will become dropdowns.
		 * To make it in to a radio button selection, add the class 'edit-radio' to the element.
		 * All others will become textboxes unless given the 'edit-checkbox' class
		 * 
		 * Input elements will be appended in to the current element and the name will move to the input
		 */
		base.setEditMode = function(elements) {
			if(typeof base.settings.views == 'undefined' || !base.settings.views)
				return; // No elements to edit
			
			var set = null;
			if(typeof elements == 'undefined')
				set = base.settings.views;
			else
				set = base.settings.views.filter(elements);
				
			set = set.not(':input'); // Only alter those which aren't already inputs
			
			// Get the sources if they have not been collected already
			base.getSources();
			
			set.each(function() {
				var self = $(this);
				var name = self.attr('name');
				var inputElement = $();
				
				// Check which kind of input to enter
				if(base.settings.source != null && typeof base.settings.source[name] != 'undefined') {
					// Determine if it should be a dropdown or radio button
					if(self.hasClass('edit-radio')) {
						for(var key in base.settings.source[name]) {
							var radioButton = document.createElement('input');
							radioButton.setAttribute('type', 'radio');
							radioButton.setAttribute('value', key);
							inputElement = inputElement.add(radioButton);
							inputElement = inputElement.add('<span>' + base.settings.source[name][key] + '</span>');
						}
					}
					else {
						var select = document.createElement('select');
						inputElement = inputElement.add(select);
						for(var key in base.settings.source[name]) {
							var option = document.createElement('option');
							option.setAttribute('value', key);
							option.innerHTML = base.settings.source[name][key];
							if(key == self.text() || base.settings.source[name][key] == self.text()) // If this is the currently displayed value
								option.setAttribute('selected', 'selected');						 // select the given value
							inputElement.append(option);
						}
					}
				}
				else {
					// Determine if it should be a textbox or checkbox
					if(self.hasClass('edit-checkbox')) {
						var checkBox = document.createElement('input');
						checkBox.setAttribute('type', 'checkbox');
						inputElement = $(checkBox);
					}
					else {
						var textBox = document.createElement('input');
						textBox.setAttribute('type', 'text');
						textBox.setAttribute('value', self.text());
						inputElement = $(textBox);
					}
				}
				
				inputElement.attr('name', name);
				self.attr('name', '');
				self.text('');
				self.append(inputElement);
				
				// Rebind the field
				base.settings.views = base.settings.views.not(self);
				base.settings.views = base.settings.views.add(inputElement);
			});
		}
		
		/*
		 * SetDisplayMode
		 * Argument: elements - Accepts none or NULL for all elements, a string selector, or a subset of elements
		 * Converts the selected elements in to display only tags.
		 * This is done by taking the name and display value and placing them on the parent then removing the input
		 */
		base.setDisplayMode = function(elements) {
			if(typeof base.settings.views == 'undefined' || !base.settings.views)
				return; // No elements to edit
			
			var set = null;
			if(typeof elements == 'undefined')
				set = base.settings.views;
			else
				set = base.settings.views.filter(elements);
				
			set = set.filter(':input'); // Only alter those which are inputs
			
			set.each(function() {
				var self = $(this);
				var parentElement = self.parent();
				// Determine which text value to use
				if(self.is('select'))	// Dropdown
					parentElement.text(self.children(':selected').text());
				else if(self.is('input[type=radio]'))	// Radio button
					parentElement.text(self.next('span').text());
				else if(self.is('input[type=checkbox]'))	// Checkbox
					parentElement.text( (self.is(':checked')) ? base.settings.trueDisplay : base.settings.falseDisplay );
				else
					parentElement.text(self.val());		// Textbox
				
				// Remove the input and add the parent back to the views
				parentElement.attr('name', self.attr('name'));
				base.settings.views = base.settings.views.add(parentElement);
				base.settings.views = base.settings.views.not(self);
				self.remove();
			});
		}
		
		// call the "constructor" method
		init();

	}

	// add the plugin to the jQuery.fn object
	$.fn.liteBinder = function(options) {

		// iterate through the DOM elements we are attaching the plugin to
		return this.each(function() {

			// if plugin has not already been attached to the element
				if (undefined == $(this).data('liteBinder')) {

					// create a new instance of the plugin
					// pass the DOM element and the user-provided options as
					// arguments
					var plugin = new $.liteBinder(this, options);

					// in the jQuery version of the element
					// store a reference to the plugin object
					// you can later access the plugin and its methods and
					// properties like
					// element.data('liteBinder').publicMethod(arg1, arg2, ...
					// argn) or
					// element.data('liteBinder').settings.propertyName
					$(this).data('liteBinder', plugin);

				}

			});

	}

})(jQuery);