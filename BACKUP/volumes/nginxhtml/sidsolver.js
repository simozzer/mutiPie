class SidukoSolver {
    #oPuzzle;
    #sortedPossibleValuesList;
    #passIndex = 0;
    #stack = [];
    #fast = true;
    #fnComplete;
    #fastinterval = 8000;    
    #intervalsRemaining = 0;

    constructor(oPuzzle, fnComplete) {
        this.#oPuzzle = oPuzzle;
        this.cells = this.#oPuzzle.data.cells;        
        this.#sortedPossibleValuesList = this.cells.filter(oCell => oCell.value < 1).sort((a, b) => SidukoCellQueries.getPossibleValues(this.#oPuzzle.data,a).length - SidukoCellQueries.getPossibleValues(this.#oPuzzle.data,b).length);
        this.#fnComplete = fnComplete;
        this.#intervalsRemaining = this.#fastinterval;
    }

    solveSomething() {
        let stepProducedProgress;
        do {
            stepProducedProgress = false;
            if (this.applyCellsWithOnePossibleValue()) {
                this.solvedSomething = true;
                stepProducedProgress = true;
                return true;
            }
        } while (stepProducedProgress)
            return false;
    }

    // Within a set of 9 cells find and cells which can be the only cell containing a specific value and set them
    solveCells(aCellsToSolve) {
        let stepProducedProgress = false;
        let continueLooping = false;
        const oPuzzleData = this.#oPuzzle.data;
        do {
            continueLooping = false;

            for (let possibleValue = 1; possibleValue < 10; possibleValue++) {
                let iOccurenceCount = 0;
                aCellsToSolve.forEach(oCell => {
                    if ((SidukoCellQueries.getPossibleValues(oPuzzleData,oCell).indexOf(possibleValue) > -1)) {
                        iOccurenceCount++;
                    }
                });

                if (iOccurenceCount === 1) {
                    const oCellToAdjust = aCellsToSolve.find(oCell => SidukoCellQueries.getPossibleValues(oPuzzleData,oCell).indexOf(possibleValue) > -1);
                    if (oCellToAdjust && oCellToAdjust.value < 1) {
                        this.solvedSometing = true;
                        stepProducedProgress = true;
                        continueLooping = true;
                        oCellToAdjust.value = possibleValue;
                        if (!this.#fast) {
                            this.#intervalsRemaining --;
                            if (this.#intervalsRemaining >= 0) {
                                this.#intervalsRemaining --;
                            } else {
                                this.#intervalsRemaining = this.#fastinterval;
                                oCellToAdjust.element.innerText = possibleValue;
                                oCellToAdjust.element.title = '';
                                oCellToAdjust.element.classList.add('solved');
                            }
                        }
                        oCellToAdjust.setSolved();
                        oCellToAdjust.passIndex = this.#passIndex;
                    }
                }
            }
        } while (continueLooping);
        return stepProducedProgress;
    }

    solveInnerTables() {
        let stepProducedProgress;
        do {
            stepProducedProgress = false;
            for (let i = 0; ((i < 9) && stepProducedProgress); i++) {
                stepProducedProgress = this.solveCells(this.#oPuzzle.data.cellsInInnerTable(i));
            }
        } while (stepProducedProgress);
    }

    solveRows() {
        let stepProducedProgress;
        do {
            stepProducedProgress = false;
            for (let i = 0; ((i < 9) && stepProducedProgress); i++) {
                stepProducedProgress = this.solveCells(this.#oPuzzle.data.cellsInRow(i));
            }
        } while (stepProducedProgress);
    }

    solveColumns() {
        let stepProducedProgress;
        do {
            stepProducedProgress = false;
            for (let i = 0;((i < 9) && stepProducedProgress); i++) {
                stepProducedProgress = this.solveCells(this.#oPuzzle.data.cellsInColumn(i));
            }
        } while (stepProducedProgress);
    }

    // Try to solve based on current data, by process of illimination
    doSimpleSolve() {
        try {
            this.solvedSometing = true;
            while (this.solvedSometing) {
                this.solvedSometing = false;
                this.solveInnerTables();
                this.solveRows();
                this.solveColumns();
                
                this.solveSomething();
            }
        } catch (err) {
            window.alert(err);
        }
    }

    async doExecuteAsync() {
        return new Promise((resolve) => {
            window.setTimeout(function (that) {
                if (that.processNextCell()) {
                    that.#passIndex++;
                    resolve(true);
                } else {
                    that.rewind();
                    resolve(false);
                }
                
            }, 0, this);
        });
    }


    doExecute() {
        if (this.processNextCell()) {
            this.#passIndex++
        } else {
            this.rewind();
        }
    }

    async execute() {
        this.#passIndex++;

        this.doSimpleSolve();

        this.#passIndex = 1;
        let iExecutionCount = 0;
        const startTime = new Date().getTime();
        let oCells = this.#oPuzzle.data.cells;
        if (this.#fast) {
            do {
                 this.doExecute();
                iExecutionCount++;
            } while (oCells.filter(oCell => oCell.value === 0).length > 0);

            
            
            oCells.forEach(oCell => {
                if (!oCell.fixed) {
                    const oElem = oCell.element;
                    oElem.innerHTML = oCell.value;
                    oElem.classList.remove('bob');
                    oElem.classList.add('solved');                    
                }
            });

            } else {
            do {

                    await this.doExecuteAsync().then(() => {                        
                        iExecutionCount++;
                    });

            } while (await oCells.filter(cell => cell.value === 0).length > 0);
        }
        const duration = new Date().getTime() - startTime;
        document.querySelector('#everywhere table').classList.add('solved');
        if (typeof(this.#fnComplete) === "function") {
            this.#fnComplete(`Done: 'doExecute' was called ${iExecutionCount} times and took ${duration} ms.`);
        }
        
    }

    rewind() {
        const oLastUpdatedCell = this.#stack.pop();
        this.cells.forEach(o => {
            if (o.passIndex === oLastUpdatedCell.passIndex) {
                o.reset(this.#fast);
            }
        })
        oLastUpdatedCell.choiceIndex++;
        oLastUpdatedCell.reset(this.#fast);
        const oPuzzleData = this.#oPuzzle.data;
        if (!SidukoCellQueries.canSetACellValue(oPuzzleData,oLastUpdatedCell)) {
            oLastUpdatedCell.choiceIndex = 0;
            const oPrevCell = this.#stack[this.#stack.length - 1];
            oPuzzleData.cells.forEach(o => {
                if (o.passIndex === oPrevCell.passIndex) {
                    o.reset(this.#fast);
                }
            });
            oPrevCell.reset(this.#fast);
            this.rewind();
        }
    }

    processNextCell() {
        const oPuzzleData = this.#oPuzzle.data;

        // Get a list of the cells which have no .value and sort the list so that the highest number of possible values comes first
        this.#sortedPossibleValuesList = this.cells.filter(oCell => oCell.value < 1).sort((a, b) => SidukoCellQueries.getPossibleValues(oPuzzleData,a).length - SidukoCellQueries.getPossibleValues(oPuzzleData,b).length);        
        let cellsWithMutlipleSolutions = this.#sortedPossibleValuesList.filter(oCell => SidukoCellQueries.getPossibleValues(oPuzzleData, oCell).length > 0);

        
        if (this.#sortedPossibleValuesList.map(o => SidukoCellQueries.getPossibleValues(oPuzzleData,o)).filter(o => o.length > 0).length === 0) {
            // some of the cells on the grid have no possible answer
            return false;
        };

        const oSolveCell = cellsWithMutlipleSolutions[0];
        const aPossibleCellValues = SidukoCellQueries.getPossibleValues(oPuzzleData,oSolveCell);
        const iLen = aPossibleCellValues.length;
        if (oSolveCell.choiceIndex < iLen && SidukoCellQueries.canSetACellValue(oPuzzleData,oSolveCell)) {
            oSolveCell.value = aPossibleCellValues[oSolveCell.choiceIndex];
            oSolveCell.suggested = true;
            oSolveCell.passIndex = this.#passIndex;
            if (!this.#fast) {
                oSolveCell.element.innerHTML = oSolveCell.value;
                oSolveCell.element.classList.add('suggested');
            }
            this.#stack.push(oSolveCell);
            this.doSimpleSolve();
            return true;
        } else {
            return false;
        }
    }

    applyCellsWithOnePossibleValue() {
        const oPuzzleData = this.#oPuzzle.data;
        const oSingleValueCells = this.#sortedPossibleValuesList.filter(oCell => oCell.value < 1 && SidukoCellQueries.getPossibleValues(oPuzzleData,oCell).length === 1);
        oSingleValueCells.forEach(oCell => {
            const iValue = SidukoCellQueries.getPossibleValues(oPuzzleData,oCell)[0];
            if (iValue && SidukoCellQueries.canSetValue(oPuzzleData,oCell, iValue)) {
                oCell.value = iValue;
                if (!this.#fast) {
                    oCell.element.innerText = iValue;
                    oCell.element.title = '';
                    oCell.element.classList.add('solved');
                }
                oCell.setSolved();
                oCell.passIndex = this.#passIndex;            
                return true;
            }
        });
        return false;
    }

}
