document.addEventListener("DOMContentLoaded", () => {
    const parcelCountInput = document.getElementById("parcelCount");
    const registeredAreaInput = document.getElementById("registeredArea");
    const calculatedAreaInput = document.getElementById("calculatedArea");
    const generateButton = document.getElementById("generateButton");
    const calculateButton = document.getElementById("calculateButton");
    const copyButton = document.getElementById("copyButton");
    const inputContainer = document.getElementById("inputContainer");
    const resultsContainer = document.getElementById("results");

    let parcelInputs = [];

    function addParcelRow(parcelNum, parcelAreaValue = "", parcelNumValue = "") {
        const parcelWrapper = document.createElement("div");

        const parcelNumber = document.createElement("input");
        parcelNumber.placeholder = "Parcel Number";
        parcelNumber.type = "number";
        parcelNumber.className = "input-field";
        parcelNumber.value = parcelNumValue;

        const parcelArea = document.createElement("input");
        parcelArea.placeholder = "Area (m²)";
        parcelArea.type = "number";
        parcelArea.className = "input-field";
        parcelArea.value = parcelAreaValue;

        const removeButton = document.createElement("button");
        removeButton.textContent = "-";
        removeButton.classList.add("remove-btn");
        removeButton.onclick = () => {
            inputContainer.removeChild(parcelWrapper);
            parcelInputs = parcelInputs.filter(p => p.wrapper !== parcelWrapper);
        };

        const addButton = document.createElement("button");
        addButton.textContent = "+";
        addButton.classList.add("add-btn");
        addButton.onclick = () => addParcelRow(parcelInputs.length + 1);

        parcelWrapper.append(parcelNumber, parcelArea, addButton, removeButton);
        inputContainer.appendChild(parcelWrapper);

        parcelInputs.push({ numberInput: parcelNumber, areaInput: parcelArea, wrapper: parcelWrapper });
    }

    generateButton.addEventListener("click", () => {
        inputContainer.innerHTML = "";
        resultsContainer.innerHTML = "";
        parcelInputs = [];
        copyButton.style.display = "none";

        const parcelCount = parseInt(parcelCountInput.value, 10);
        if (isNaN(parcelCount) || parcelCount <= 0) {
            alert("Please enter a valid number of parcels.");
            return;
        }

        for (let i = 1; i <= parcelCount; i++) {
            addParcelRow(i);
        }

        calculateButton.style.display = "block";
    });

    calculateButton.addEventListener("click", () => {
        resultsContainer.innerHTML = "";
        copyButton.style.display = "none";

        const registeredArea = parseFloat(registeredAreaInput.value);
        const calculatedArea = parseFloat(calculatedAreaInput.value);
        const absoluteDifference = Math.abs(registeredArea - calculatedArea);
        const permissibleError = (0.8 * Math.sqrt(registeredArea)) + (0.002 * registeredArea);

        let totalBeforeRounding = 0;
        let totalAfterRounding = 0;

        let tableContent = `<table id="resultsTable">
                                <tr>
                                    <th>Parcel Number</th>
                                    <th>New Area</th>
                                    <th>Rounded Area</th>
                                </tr>`;

        parcelInputs.forEach((parcel) => {
            const parcelNumber = parcel.numberInput.value.trim();
            const parcelArea = parseFloat(parcel.areaInput.value);
            let newArea = (registeredArea / calculatedArea) * parcelArea;
            let roundedArea = Math.round(newArea);

            if (!isNaN(parcelArea) && parcelArea > 0 && parcelNumber !== "") {
                totalBeforeRounding += newArea;
                totalAfterRounding += roundedArea;

                tableContent += `<tr>
                                    <td>${parcelNumber}</td>
                                    <td>${newArea.toFixed(2)}</td>
                                    <td>${roundedArea}</td>
                                </tr>`;
            }
        });

        tableContent += `<tr>
                            <td><strong>Total:</strong></td>
                            <td><strong>${totalBeforeRounding.toFixed(2)}</strong></td>
                            <td><strong>${totalAfterRounding}</strong></td>
                        </tr>
                    </table>`;

        resultsContainer.innerHTML = `
            <p><strong>Absolute Difference:</strong> ${absoluteDifference.toFixed(2)}</p>
            <p><strong>Permissible Error:</strong> ${permissibleError.toFixed(2)}</p>
            ${tableContent}
        `;

        copyButton.style.display = "block";
    });

    // Copy Table Function (Fixed)
    copyButton.addEventListener("click", () => {
        const table = document.getElementById("resultsTable");
        if (!table) {
            alert("No table found to copy.");
            return;
        }

        let textToCopy = "";
        const rows = table.querySelectorAll("tr");

        rows.forEach(row => {
            const cells = row.querySelectorAll("th, td");
            let rowText = [];
            cells.forEach(cell => {
                rowText.push(cell.innerText.trim());
            });
            textToCopy += rowText.join("\t") + "\n"; // Tab-separated values
        });

        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        alert("Table copied to clipboard!");
    });
});
