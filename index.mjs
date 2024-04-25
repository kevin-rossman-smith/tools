/*
Breakdown of URL Parameters:
fixCasing=true: 
  This parameter converts all JSON keys into a more readable format (e.g., converting "camelCaseKey" to "Camel Case Key").
excludeRows=key1,key2: 
  This parameter excludes any rows (key/value pairs) where the keys are "key1" or "key2".
excludeKeys=key3: 
  This parameter excludes the key cells where the key is "key3", showing only the corresponding values.
sortByType=true: 
  This parameter sorts the fields in the JSON by type, placing string and number values at the top, followed by arrays, and objects at the bottom.
logo_url=https://example.com/logo.png:
  Specifies the URL for the logo to be displayed at the top of the HTML table.
logo_width=100 and logo_height=50: 
  Specifies the dimensions of the logo.
renderImages=true: 
  Enables automatic conversion of string values that start with "http" into <img> tags.
images_width=200 and images_height=100: 
  Specifies the dimensions for any images rendered from URL fields.*/


/*const cellStyles = {
  headerCell: "border: 1px solid black; padding: 8px; background-color: #f0f0f0; vertical-align: top;text-align: left;",
  regularCell: "border: 1px solid black; padding: 8px; background-color: #cf3;",
  sectionCell: "border: 1px solid black; padding: 8px; background-color: #eee;",
  logoCell: "text-align: center;",
  imageCell: "border: 1px solid black; padding: 8px;",
  emptyKeyCell: "border: 1px solid black; padding: 8px; width: 50px; background-color: #fff;"  // Special style for empty key cells
};*/
/*const cellStyles = {
    keyStringNumber: "border: 1px solid gray; padding: 8px; background-color: #f4f4f4; width: 30px",
    valueStringNumber: "padding: 8px; background-color: #f9f9f9;",
    keyArray: "border: 3px solid #ddc9f8; padding: 8px; background-color: #efe5fb;",
    valueArray: "border: 3px solid #ddc9f8; padding: 8px; background-color: #ddc9f8;",
    keyObject: "border: 1px solid gray; padding: 8px; background-color: light-gray;",
    valueObject: "border: 1px solid gray; padding: 8px;",
    keyImageUrl: "padding: 8px; background-color: #cff4fc;",
    valueImageUrl: "padding: 8px; background-color: #e5fbfa;",
    arrayHeader: "padding: 8px; background-color: #c4a0f2;"  // Style for array headers
};*/
const cellStyles = {
  headerKeys: "border-bottom: 1px solid #ccc; padding: 10px; background-color: #f7f7f7; color: #256000; font-weight: bold; text-align: center;",

  keyStringNumber: "padding: 8px; background-color: #fafafa; color: #333; font-weight: bold;",
  valueStringNumber: "padding: 8px; background-color: #ffffff; color: #555;",
  keyArray: "border: 2px solid black; padding: 8px; background-color: #e3f2fd; color: cdaff4; font-weight: bold;",
  valueArray: "border: 2px solid black; padding: 8px; background-color: #e1f5fe; color: #555;",
  keyObject: "padding: 8px; background-color: #e8eaf6; color: #3f51b5; font-weight: bold;",
  valueObject: "padding: 8px; background-color: #eceff1; color: #555;",
  keyImageUrl: "padding: 8px; background-color: #fbe9e7; color: #d84315; font-weight: bold;",
  valueImageUrl: "padding: 8px; background-color: #ffebee; color: #555;",
  arrayHeader: "padding: 8px; background-color: #cdaff4; color: #256029; font-weight: bold; border-bottom: 2px solid #a5d6a7;",

};



// AWS Lambda Handler Function
export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Extract URL parameters from the query string
    const params = event.queryStringParameters || {};
    const options = {
      fixCasing: params.fixCasing === 'true',
      excludeRows: params.excludeRows ? params.excludeRows.split(',') : [],
      excludeKeys: params.excludeKeys ? params.excludeKeys.split(',') : [],
      logoUrl: params.logo_url,
      logoWidth: params.logo_width || 'auto',
      logoHeight: params.logo_height || 'auto',
      renderImages: params.renderImages === 'true',
      imagesWidth: params.images_width || 'auto',
      imagesHeight: params.images_height || 'auto',
      sortByType: params.sortByType === 'true',
      headerKeys: params.headerKeys ? params.headerKeys.split(',') : []
    };

    let processedBody = body;
    processedBody = options.sortByType ? sortJsonByType(body) : body;
    processedBody = options.fixCasing ? fixCasingInJson(processedBody) : processedBody;
    processedBody = params.excludeRows ? excludeRowsFromJson(processedBody, options.excludeRows) : processedBody;
    processedBody = params.excludeKeys ? excludeKeysFromJson(processedBody, options.excludeKeys) : processedBody;
    const htmlTable = jsonToNestedHtmlTable(processedBody, options);

    // Create a response object with the generated HTML table
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html', // Send as HTML content type
      },
      body: htmlTable // Send the HTML directly
    };
    return response;
  }
  catch (error) {
    console.error('Error:', error);

    // Return a structured error response if JSON parsing fails or other errors occur
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: 'Error processing request: ' + error.message
    };
  }
};

// Function to sort JSON fields by type: numbers/strings, arrays, then objects
function sortJsonByType(jsonData) {
  // Recursive function to sort an object by value types
  function sortObject(obj) {
    const imageUrls = {};
    const primitives = {};
    const arrays = {};
    const objects = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('http')) {
        imageUrls[key] = value; // Image URLs
      }
      else if (Array.isArray(value)) {
        arrays[key] = value.map(item =>
          typeof item === 'object' && item !== null ? sortObject(item) : item
        );
      }
      else if (value !== null && typeof value === 'object') {
        objects[key] = sortObject(value); // Recurse into nested objects
      }
      else {
        primitives[key] = value; // All other primitives
      }
    });

    // Merge objects in the order: image URLs, other primitives, arrays, and finally nested objects
    return { ...imageUrls, ...primitives, ...arrays, ...objects };
  }

  // Start the sorting with the input JSON data
  return sortObject(jsonData);
}

function fixCasingInJson(jsonData) {
  // Recursive function to fix casing of keys in an object or array
  function fixObjectKeys(obj) {
    if (Array.isArray(obj)) {
      // Process each item in the array
      return obj.map(item => fixObjectKeys(item));
    }
    else if (obj !== null && typeof obj === 'object') {
      // Process each key-value pair in the object
      const fixedObject = {};
      Object.entries(obj).forEach(([key, value]) => {
        const fixedKey = fixKeyCasing(key);
        fixedObject[fixedKey] = fixObjectKeys(value); // Recursively fix nested objects or arrays
      });
      return fixedObject;
    }
    // Return the value if it is neither an object nor an array
    return obj;
  }

  // Start the process with the input JSON data
  return fixObjectKeys(jsonData);
}

function excludeKeysFromJson(jsonData, keysToExclude) {
  // Recursive function to replace keys if they are in the exclude list
  function processObjectKeys(obj) {
    if (Array.isArray(obj)) {
      // Process each item in the array
      return obj.map(item => processObjectKeys(item));
    }
    else if (obj !== null && typeof obj === 'object') {
      // Process each key-value pair in the object
      const processedObject = {};
      Object.entries(obj).forEach(([key, value]) => {
        // Check if the key is in the list to exclude
        const modifiedKey = keysToExclude.includes(key) ? "" : key;
        processedObject[modifiedKey] = processObjectKeys(value); // Recursively process nested objects or arrays
      });
      return processedObject;
    }
    // Return the value if it is neither an object nor an array
    return obj;
  }

  // Start the process with the input JSON data
  return processObjectKeys(jsonData);
}

function excludeRowsFromJson(jsonData, rowsToExclude) {
  // Recursive function to exclude specified keys and their values
  function processObjectKeys(obj) {
    if (Array.isArray(obj)) {
      // Process each item in the array, potentially containing objects
      return obj.map(item => processObjectKeys(item)).filter(item => item !== undefined);
    }
    else if (obj !== null && typeof obj === 'object') {
      // Process each key-value pair in the object
      const processedObject = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (!rowsToExclude.includes(key)) {
          processedObject[key] = processObjectKeys(value); // Recursively process nested objects or arrays
        }
        // If the key is in rowsToExclude, it's simply not added to processedObject
      });
      return processedObject;
    }
    // Return the value if it is neither an object nor an array (i.e., base case)
    return obj;
  }

  // Start the process with the input JSON data
  return processObjectKeys(jsonData);
}

function fixKeyCasing(key) {
  return key.replace(/([A-Z]+)([A-Z][a-z])/g, ' $1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([^\w]|_)+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}



/*function jsonToNestedHtmlTable(jsonData, options) {
  let html = '<table style="width:100%; border-collapse: collapse;">';

  if (options.logoUrl) {
    html += `<tr><td colspan="2" style="${cellStyles.logoCell}"><img src="${options.logoUrl}" width="${options.logoWidth}" height="${options.logoHeight}" /></td></tr>`;
  }

  function processObject(obj, isRoot = true) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        html += `<tr><td colspan="2" style="${cellStyles.headerCell}">[${index + 1}]:</td></tr>`;
        html += '<tr><td colspan="2" style="${cellStyles.regularCell}">';
        html += '<table style="width:100%; border-collapse: collapse;">';
        processObject(item, false);
        html += '</table>';
        html += '</td></tr>';
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        let displayKey = key;
        let style = cellStyles.sectionCell;

        if (options.excludeKeys.includes(key)) {
          displayKey = ""; // Replace key with empty string if excluded
          style = cellStyles.emptyKeyCell; // Use special style for empty key cells
        } else if (options.fixCasing) {
          displayKey = fixKeyCasing(key); // Fix casing if enabled
        }

        let displayValue = value;

        if (typeof value === 'object' && value !== null) {
          html += `<tr><td style="${style}">${displayKey}</td><td style="${cellStyles.regularCell}">`;
          html += '<table style="width:100%; border-collapse: collapse;">';
          processObject(value, false);
          html += '</table>';
          html += '</td></tr>';
        } else {
          if (typeof value === 'string' && value.startsWith('http') && options.renderImages) {
            displayValue = `<img src="${value}" width="${options.imagesWidth}" height="${options.imagesHeight}" style="${cellStyles.imageCell}" />`;
          }
          html += `<tr><td style="${style}">${displayKey}</td><td style="${cellStyles.regularCell}">${displayValue}</td></tr>`;
        }
      });
    }
  }

  processObject(jsonData, true);
  html += '</table>';
  return html;
}*/
/*function jsonToNestedHtmlTable(jsonData) {
    let html = '<table style="width:100%; border-collapse: collapse;">';

    function processKeyValue(key, value, depth = 0) {
        let keyStyle = '';
        let valueStyle = '';
        let valueContent = '';

        const imageRegex = /^https?:\/\/.*\.(jpg|jpeg|png|gif|svg)(\?.*)?$/i;

        if (typeof value === 'string' && imageRegex.test(value)) {
            keyStyle = cellStyles.keyImageUrl;
            valueStyle = cellStyles.valueImageUrl;
            valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;">`;
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            keyStyle = cellStyles.keyObject;
            valueStyle = cellStyles.valueObject;
            valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
        } else if (Array.isArray(value)) {
            let arrayHtml = value.map((item, index) => 
                `<tr><td colspan="2" style="${cellStyles.arrayHeader}">Index ${index + 1}</td></tr>` +
                `<tr><td colspan="2"><table style="width:100%; border-collapse: collapse;">${processObject(item, depth + 1)}</table></td></tr>`
            ).join('');
            return arrayHtml;  // Directly return the array HTML
        } else {
            keyStyle = cellStyles.keyStringNumber;
            valueStyle = cellStyles.valueStringNumber;
            valueContent = value;
        }

        return `<tr><td style="${keyStyle}">${key}</td><td style="${valueStyle}">${valueContent}</td></tr>`;
    }

    function processObject(obj, depth = 0) {
        if (Array.isArray(obj)) {
            return obj.map((item, index) => processKeyValue(`Index ${index + 1}`, item, depth)).join('');
        } else if (obj !== null && typeof obj === 'object') {
            return Object.entries(obj).map(([key, value]) => processKeyValue(key, value, depth)).join('');
        }
        return '';  // Handle edge cases
    }

    html += processObject(jsonData);
    html += '</table>';
    return html;
}*/
/*function jsonToNestedHtmlTable(jsonData, options) {
    let html = '<table style="width:100%; border-collapse: collapse;">';

    function processKeyValue(key, value, depth = 0) {
        let keyStyle = cellStyles.keyStringNumber;
        let valueStyle = '';
        let valueContent = '';
        let isHeaderRow = options.headerRows && options.headerRows.includes(key);

        // If the key is part of headerRows, prepare to insert a header row
        if (isHeaderRow) {
            html += `<tr><td colspan="2" style="${cellStyles.headerRow}">${fixKeyCasing(key)}</td></tr>`;
        }

        // Handling different types of value
        if (typeof value === 'string' && value.startsWith('http')) {
            valueStyle = cellStyles.valueImageUrl;
            valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;">`;
        } else if (typeof value === 'object' && value !== null) {
            valueStyle = value instanceof Array ? cellStyles.valueArray : cellStyles.valueObject;
            valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
        } else {
            valueStyle = cellStyles.valueStringNumber;
            valueContent = value;
        }

        // If not a header row, include the key next to the value
        if (!isHeaderRow) {
            html += `<tr><td style="${keyStyle}">${fixKeyCasing(key)}</td><td style="${valueStyle}">${valueContent}</td></tr>`;
        } else {
            // For header rows, just include the value in a new row
            html += `<tr><td colspan="2" style="${valueStyle}">${valueContent}</td></tr>`;
        }
    }

    function processObject(obj, depth = 0) {
        let content = '';
        Object.entries(obj).forEach(([key, value]) => {
            content += processKeyValue(key, value, depth);
        });
        return content;
    }

    html += processObject(jsonData, 0);
    html += '</table>';
    return html;
}*/
/*function jsonToNestedHtmlTable(jsonData, options) {
  let html = '<table style="width:100%; border-collapse: collapse;">';

  function processKeyValue(key, value, depth = 0) {
    let keyStyle = '';
    let valueStyle = '';
    let valueContent = '';

    // Regex to identify image URLs
    const imageRegex = /^https?:\/\/.*\.(jpg|jpeg|png|gif|svg)(\?.*)?$/i;


    if (typeof value === 'string' && imageRegex.test(value)) {
      keyStyle = cellStyles.keyImageUrl;
      valueStyle = cellStyles.valueImageUrl;
      valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;">`;
    }
    else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      keyStyle = cellStyles.keyObject;
      valueStyle = cellStyles.valueObject;
      valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
    }
    else if (Array.isArray(value)) {
      let totalElements = value.length;
      let arrayContent = value.map((item, index) => {
        let itemContent = processObject(item, depth + 1);
        return `
                  <tr><td colspan="2" style="${cellStyles.arrayHeader}">${key} [${index + 1}/${totalElements}]</td></tr>
                  <tr><td colspan="2">
                        <table style="width:100%; padding: 8px; border-collapse: separate; border: 1px solid black; ">
                            <tr><td>${itemContent}</td></tr>
                        </table>
                   </td></tr>
                `;
      }).join('');
      return arrayContent; // Return formatted array HTML
    }
    else {
      keyStyle = cellStyles.keyStringNumber;
      valueStyle = cellStyles.valueStringNumber;
      valueContent = value;
    }

    return `<tr><td style="${keyStyle}">${key}</td><td style="${valueStyle}">${valueContent}</td></tr>`;
  }

  function processObject(obj, depth = 0) {
    if (Array.isArray(obj)) {
      return obj.map((item, index) => processKeyValue(`Index ${index + 1}`, item, depth)).join('');
    }
    else if (obj !== null && typeof obj === 'object') {
      return Object.entries(obj).map(([key, value]) => processKeyValue(key, value, depth)).join('');
    }
    return ''; // Handle edge cases
  }

  html += processObject(jsonData);
  html += '</table>';
  return html;
}*/

/*this one works but messes up closing html tags when headerKeys are specified*/
/*function jsonToNestedHtmlTable(jsonData, options) {
  let html = '<table style="width:100%; border-collapse: collapse;">';

  function processKeyValue(key, value, depth = 0) {
    let keyStyle = '';
    let valueStyle = '';
    let valueContent = '';
    let isHeaderKey = options.headerKeys && options.headerKeys.includes(key);

    // Handle different types of value
    const imageRegex = /^https?:\/\/.*\.(jpg|jpeg|png|gif|svg)(\?.*)?$/i;

    if (isHeaderKey) {
      //handle value
      if (typeof value === 'string' && imageRegex.test(value)) {
        valueStyle = cellStyles.valueImageUrl;
        valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;"></img>`;
      }
      else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        valueStyle = cellStyles.valueObject;
        valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
      }
      else if (Array.isArray(value)) {
        return processArrayKey(key, value, depth + 1);
      }
      else {
        valueStyle = cellStyles.valueStringNumber;
        valueContent = value;
      }
      //handle key
      return `<table style="width:100%; padding: 8px; border: 1px solid black;">
                      <tr><td colspan="2" style="${cellStyles.headerKeys}">${key}</td></tr>
                      <tr><td colspan="2" style="${valueStyle}">
                        <table style="width:100%; border-collapse: separate; border: 1px solid black;">
                          <tr><td>${valueContent}</td></tr>
                        </table>
                      </td></tr>
                    </table>`;
    }
    else {
      if (typeof value === 'string' && imageRegex.test(value)) {
        valueStyle = cellStyles.valueImageUrl;
        valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;"></img>`;
      }
      else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        valueStyle = cellStyles.valueObject;
        valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
      }
      else if (Array.isArray(value)) {
        return processArrayKey(key, value, depth);
      }
      else {
        valueStyle = cellStyles.valueStringNumber;
        valueContent = value;
      }

      return `<tr>
                      <td style="${keyStyle}">${key}</td>
                      <td style="${valueStyle}">${valueContent}</td>
                    </tr>`;
    }

  }

  function processArrayKey(key, value, depth) {
    let arrayHtml = value.map((item, index) => {
      let itemContent = processObject(item, depth + 1);
      return `<tr><td colspan="2" style="${cellStyles.arrayHeader}">${key} [${index + 1}/${value.length}]</td></tr>
                      <tr><td colspan="2">
                        <table style="width:100%; padding: 8px; border-collapse: separate; border: 1px solid black;">
                          <tr><td>${itemContent}</td></tr>
                        </table>
                      </td></tr>`;
    }).join('');
    return arrayHtml;
  }

  function processObject(obj, depth = 0) {
    return Object.entries(obj).map(([key, value]) => processKeyValue(key, value, depth)).join('');
  }

  html += processObject(jsonData);
  html += '</table>';
  return html;
}*/

/* this doesn't handle array keys with their own row */
/*function jsonToNestedHtmlTable(jsonData, options) {
  let html = '<table style="width:100%; border-collapse: collapse;">';

  function processKeyValue(key, value, depth = 0) {
    let keyStyle = cellStyles.keyStringNumber;
    let valueStyle = cellStyles.valueStringNumber;
    let valueContent = '';

    const isHeaderKey = options.headerKeys && options.headerKeys.includes(key);
    const imageRegex = /^https?:\/\/.*\.(jpg|jpeg|png|gif|svg)(\?.*)?$/i;

    if (typeof value === 'string' && imageRegex.test(value)) {
      valueStyle = cellStyles.valueImageUrl;
      valueContent = `<img src="${value}" style="max-width:200px; max-height:200px;">`;
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        valueContent = processArrayKey(key, value, depth + 1);
      } else {
        valueStyle = cellStyles.valueObject;
        valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
      }
    } else {
      valueContent = value.toString();  // Convert non-string primitives to string for safe HTML insertion
    }

    if (isHeaderKey) {
      return `<tr><td colspan="2" style="${cellStyles.headerKeys}">${key}</td></tr>
              <tr><td colspan="2" style="${valueStyle}">
                <table style="width:100%; padding: 8px; border-collapse: separate;">
                  <tr><td>${valueContent}</td></tr>
                </table>
              </td></tr>`;
    } else {
      return `<tr><td style="${keyStyle}">${key}</td><td style="${valueStyle}">${valueContent}</td></tr>`;
    }
  }

  function processArrayKey(key, array, depth) {
    if (!Array.isArray(array)) {
      return `<tr><td colspan="2">Error: ${key} is not an array</td></tr>`; // Error handling for non-array data
    }
    return array.map((item, index) => processKeyValue(`${key} [${index + 1}/${array.length}]`, item, depth)).join('');
  }

  function processObject(obj, depth = 0) {
    return Object.entries(obj).reduce((acc, [key, value]) => acc + processKeyValue(key, value, depth), '');
  }

  html += processObject(jsonData);
  html += '</table>';
  return html;
} */
/* this function fails to handle image URLs appropriately */
function jsonToNestedHtmlTable(jsonData, options) {
  let html = '<table style="width:100%; border-collapse: collapse;">';

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function processKeyValue(key, value, depth = 0) {
    let keyStyle = cellStyles.keyStringNumber;
    let valueStyle = cellStyles.valueStringNumber;
    let valueContent = '';
    const isHeaderKey = options.headerKeys && options.headerKeys.includes(key);
    const urlRegex = /^https:/i; // Simpler regex for checking HTTPS URLs

    if (typeof value === 'string' && urlRegex.test(value)) {
      valueStyle = cellStyles.valueImageUrl;
      valueContent = `<img src="${escapeHtml(value)}" style="max-width:200px; max-height:200px;"></img>`;
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return processArrayKey(key, value, depth);
      } else {
        valueStyle = cellStyles.valueObject;
        valueContent = `<table style="width:100%; border-collapse: collapse;">${processObject(value, depth + 1)}</table>`;
      }
    } else {
      valueContent = escapeHtml(value.toString()); // Convert non-string primitives to string for safe HTML insertion and escape it
    }

    if (isHeaderKey) {
      return `<tr><td colspan="2" style="${cellStyles.headerKeys}">${escapeHtml(key)}</td></tr>
              <tr><td colspan="2" style="${valueStyle}">
                <table style="width:100%; padding: 8px; border-collapse: separate;">
                  <tr><td>${valueContent}</td></tr>
                </table>
              </td></tr>`;
    } else {
      return `<tr><td style="${keyStyle}">${escapeHtml(key)}</td><td style="${valueStyle}">${valueContent}</td></tr>`;
    }
  }

  function processArrayKey(key, array, depth) {
    if (!Array.isArray(array)) {
      return `<tr><td colspan="2">Error: '${escapeHtml(key)}' is not an array</td></tr>`; // Error handling for non-array data
    }
    return array.map((item, index) => {
      let itemIndex = index + 1;
      let totalElements = array.length;
      let itemContent = processObject(item, depth + 1);
      return `<tr><td colspan="2" style="${cellStyles.arrayHeader}">[${itemIndex}/${totalElements}] ${escapeHtml(key)}</td></tr>
              <tr><td colspan="2">
                <table style="width:100%; padding: 8px; border-collapse: separate; border: 1px solid black;">
                  <tr><td>${itemContent}</td></tr>
                </table>
              </td></tr>`;
    }).join('');
  }

  function processObject(obj, depth = 0) {
    if (obj === null || typeof obj !== 'object') {
      return '';  // Handle non-object or null input gracefully
    }
    return Object.entries(obj).map(([key, value]) => processKeyValue(key, value, depth)).join('');
  }

  html += processObject(jsonData, 0);
  html += '</table>';
  return html;
}
