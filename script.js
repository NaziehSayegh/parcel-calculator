document.addEventListener("DOMContentLoaded", () => {
    const parcelCountInput = document.getElementById("parcelCount");
    const registeredAreaInput = document.getElementById("registeredArea");
    const calculatedAreaInput = document.getElementById("calculatedArea");
    const generateButton = document.getElementById("generateButton");
    const calculateButton = document.getElementById("calculateButton");
    const inputContainer = document.getElementById("inputContainer");
    const resultsContainer = document.getElementById("results");

    let parcelInputs = [];

    generateButton.addEventListener("click", () => {
        inputContainer.innerHTML = ""; // Clear previous inputs
        resultsContainer.innerHTML = ""; // Clear previous results
        parcelInputs = []; // Reset parcel inputs

        const parcelCount = parseInt(parcelCountInput.value, 10);
        const registeredArea = parseFloat(registeredAreaInput.value);
        const calculatedArea = parseFloat(calculatedAreaInput.value);

        if (isNaN(parcelCount) || parcelCount <= 0) {
            alert("Please enter a valid number of parcels.");
            return;
        }

        if (isNaN(registeredArea) || isNaN(calculatedArea) || registeredArea <= 0 || calculatedArea <= 0) {
            alert("Please enter valid area values.");
            return;
        }

        // Generate input fields for parcels
        for (let i = 1; i <= parcelCount; i++) {
            const parcelInput = document.createElement("input");
            parcelInput.type = "number";
            parcelInput.placeholder = `Parcel ${i} Area`;
            parcelInput.className = "input-field";
            parcelInput.id = `parcel${i}`;
            parcelInputs.push(parcelInput);

            inputContainer.appendChild(parcelInput);
            inputContainer.appendChild(document.createElement("br"));
        }

        // Show the "Generate New Areas" button
        calculateButton.style.display = "block";

        // **Fix Scroll Issue** - Reset focus so the page doesn't jump
        document.activeElement.blur();
    });

    calculateButton.addEventListener("click", () => {
        resultsContainer.innerHTML = ""; // Clear previous results

        const registeredArea = parseFloat(registeredAreaInput.value);
        const calculatedArea = parseFloat(calculatedAreaInput.value);
        const absoluteDifference = Math.abs(registeredArea - calculatedArea);
        const permissibleError = (0.8 * Math.sqrt(registeredArea)) + (0.002 * registeredArea);

        // Display Absolute Difference and Permissible Error
        resultsContainer.innerHTML += `
            <p><strong>Absolute Difference:</strong> ${absoluteDifference.toFixed(2)}</p>
            <p><strong>Permissible Error:</strong> ${permissibleError.toFixed(2)}</p>
            <h3>New Parcel Areas:</h3>
        `;

        // Calculate new area for each parcel
        parcelInputs.forEach((parcelInput, index) => {
            const parcelArea = parseFloat(parcelInput.value);
            let newArea = parcelArea;

            if (!isNaN(parcelArea) && parcelArea > 0) {
                if (absoluteDifference < permissibleError) {
                    newArea = (registeredArea / calculatedArea) * parcelArea;
                }
                resultsContainer.innerHTML += `<p>Parcel ${index + 1}: <strong>${newArea.toFixed(2)}</strong></p>`;
            } else {
                resultsContainer.innerHTML += `<p>Parcel ${index + 1}: <strong>Invalid Input</strong></p>`;
            }
        });

        // **Fix Scroll Issue** - Ensure the page doesn't auto-scroll
        document.activeElement.blur();
    });
});
