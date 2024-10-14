class SidukoCellQueries {

    static getPossibleValues(oSudukoData, oCell) {
        const aPossibleValues = [];
        const iRow = oCell.row;
        const iCol = oCell.column;
        const iTableIndex = oCell.innerTableIndex;
        for (let iPossibleValue = 1; iPossibleValue < 10; iPossibleValue++) {
            if ((!oSudukoData.cellsInRow(iRow).find(oRowCell => oRowCell.value === iPossibleValue))
                && (!oSudukoData.cellsInColumn(iCol).find(oColumnCell => oColumnCell.value === iPossibleValue))
                && (!oSudukoData.cellsInInnerTable(iTableIndex).find(oInnerTableCell => oInnerTableCell.value === iPossibleValue))) {
                aPossibleValues.push(iPossibleValue);
            }


        }
        return aPossibleValues;
    }

    //TODO: speed up places: 24075, 23454 ms to run horrible puzzle on ununtu vm
    static canSetValue(oSudukoData,oCell, value) {
        const iRow = oCell.row;
        const iCol = oCell.column;
        const iTableIndex = oCell.innerTableIndex;
        if ((!oSudukoData.cellsInRow(iRow).find(oRowCell => oRowCell.value === value))
            && (!oSudukoData.cellsInColumn(iCol).find(oColumnCell => oColumnCell.value === value))
            && (!oSudukoData.cellsInInnerTable(iTableIndex).find(oInnerTableCell => oInnerTableCell.value === value))) {
            return true
        }
        return false;
    }

    static canSetACellValue(oSudukoData,oCell) {
        const aPossibleCellValues = this.getPossibleValues(oSudukoData,oCell);
        let iChoiceIndex = oCell.choiceIndex;
        const iLen = aPossibleCellValues.length;
        if (iChoiceIndex < iLen) {
            let choice = aPossibleCellValues[iChoiceIndex];
            while ((iChoiceIndex < iLen - 1) && (!SidukoCellQueries.canSetValue(oSudukoData, oCell, choice))) {
                iChoiceIndex++;
            }
            if (this.canSetValue(oSudukoData,oCell, choice)) {
                oCell.choiceIndex = iChoiceIndex;
                return true;
            }
        }
        return false;
    }
}