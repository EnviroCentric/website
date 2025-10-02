import React, { useEffect, useRef, useState } from 'react';

/**
 * Google Places Autocomplete component using Google Maps Extended Component Library
 * This component provides address autocomplete functionality without requiring a map
 * 
 * Note: This uses the modern <gmpx-place-picker> component which uses the new 
 * google.maps.places.PlaceAutocompleteElement under the hood, avoiding the 
 * deprecated google.maps.places.Autocomplete API. Any deprecation warnings 
 * in the console are informational and do not affect this implementation.
 */
const GooglePlacesAutocomplete = ({ 
  value, 
  onChange, 
  onPlaceSelect, 
  placeholder = "Enter address...",
  className = "",
  required = false,
  disabled = false,
  type = "address" // Can be: "address", "establishment", "geocode", "(cities)", "(regions)"
}) => {
  const placePickerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if Google Maps Extended Component Library is loaded
    const checkLibraryLoaded = () => {
      if (window.customElements && window.customElements.get('gmpx-place-picker')) {
        setIsLoaded(true);
        setupPlacePicker();
      } else {
        setTimeout(checkLibraryLoaded, 100);
      }
    };

    checkLibraryLoaded();
  }, []);

  const setupPlacePicker = () => {
    const placePicker = placePickerRef.current;
    if (!placePicker) return;

    // Set the type filter for the place picker
    placePicker.type = type;

    // Listen for place selection changes
    placePicker.addEventListener('gmpx-placechange', handlePlaceChange);

    return () => {
      if (placePicker) {
        placePicker.removeEventListener('gmpx-placechange', handlePlaceChange);
      }
    };
  };

  const handlePlaceChange = (event) => {
    const place = event.target.value;
    
    if (!place || !place.location) {
      setError("No location details available for this address");
      return;
    }

    const addressData = {
      place_id: place.id,
      formatted_address: place.formattedAddress,
      display_name: place.displayName,
      latitude: place.location.lat,
      longitude: place.location.lng,
      // Extract address components if available
      address_components: place.addressComponents || []
    };

    // Extract structured address parts
    const extractedParts = extractAddressParts(addressData.address_components);
    
    const enrichedData = {
      ...addressData,
      ...extractedParts
    };

    setError(null);
    if (onPlaceSelect) {
      onPlaceSelect(enrichedData);
    }
  };

  const extractAddressParts = (components) => {
    const parts = {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    };

    if (!components || !Array.isArray(components)) return parts;

    components.forEach(component => {
      const types = component.types || [];
      
      if (types.includes('street_number')) {
        parts.street_number = component.longText;
      } else if (types.includes('route')) {
        parts.route = component.longText;
      } else if (types.includes('subpremise')) {
        parts.address_line2 = `Apt ${component.longText}`;
      } else if (types.includes('locality')) {
        parts.city = component.longText;
      } else if (types.includes('administrative_area_level_1')) {
        parts.state = component.shortText;
      } else if (types.includes('postal_code')) {
        parts.zip = component.longText;
      } else if (types.includes('country')) {
        parts.country = component.longText;
      }
    });

    // Build address line 1 from street number and route
    parts.address_line1 = `${parts.street_number || ''} ${parts.route || ''}`.trim();

    return parts;
  };

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    if (onChange) {
      onChange(inputValue);
    }
  };

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={handleInputChange}
        placeholder="Loading Google Places..."
        className={`${className} animate-pulse`}
        disabled={true}
      />
    );
  }

  return (
    <div className="relative">
      <gmpx-place-picker
        ref={placePickerRef}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${className}`}
        style={{
          '--gmpx-color-primary': '#3B82F6',
          '--gmpx-color-on-surface': '#374151',
          '--gmpx-font-family': 'inherit'
        }}
      />
      {error && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Google Maps API Loader component
 * This component loads the Google Maps Extended Component Library
 */
export const GoogleMapsLoader = ({ apiKey, children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const loaderRef = useRef(null);

  useEffect(() => {
    // Check if the library is already loaded
    if (window.customElements && window.customElements.get('gmpx-api-loader')) {
      setIsLoaded(true);
      return;
    }

    // Load the Extended Component Library (latest version)
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@googlemaps/extended-component-library@^0.6';
    
    script.onload = () => {
      setIsLoaded(true);
      setError(null);
    };

    script.onerror = () => {
      setError('Failed to load Google Maps Extended Component Library');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    // Set the API key on the web component after it's loaded
    if (isLoaded && loaderRef.current && apiKey) {
      loaderRef.current.setAttribute('key', apiKey);
      
      // Suppress deprecation warnings by setting solution channel
      loaderRef.current.setAttribute('solution-channel', 'GMP_CCS_autocomplete_v6');
    }
  }, [isLoaded, apiKey]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
        <p className="text-sm text-red-800 dark:text-red-200">
          {error}
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Please check your internet connection and try again.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading Google Places...</span>
      </div>
    );
  }

  return (
    <>
      <gmpx-api-loader
        ref={loaderRef}
        solution-channel="GMP_CCS_autocomplete_v6"
      />
      {children}
    </>
  );
};

export default GooglePlacesAutocomplete;