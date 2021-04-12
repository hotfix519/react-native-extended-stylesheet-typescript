"use strict";
/**
 * Calculates particular value
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rem_1 = require("./replacers/rem");
const vars_1 = require("./replacers/vars");
const percent_1 = require("./replacers/percent");
const operation_1 = require("./replacers/operation");
const scale_1 = require("./replacers/scale");
class Value {
    /**
     * Constructor
     *
     * @param {*} value
     * @param {String} prop property for which valye is calculated
     * @param {Array} varsArr array of objects with vars
     * @param {Object} [options]
     * @param {Array} [options.stack] stack of calls when resolving variable
     * @param {Boolean} [options.isOperation] is value calculated inside operation
     */
    constructor(value, prop, varsArr = [], options = {}) {
        this.value = value;
        this.outValue = null;
        this.prop = prop;
        this.varsArr = varsArr;
        this.stack = options.stack || [];
        this.isOperation =
            options.isOperation !== undefined ? options.isOperation : false;
    }
    /**
     * Calculates value:
     * execute function, resolve var refs, convert string of (rem, percent) to pixels
     */
    calc() {
        if (typeof this.value === 'function') {
            this.value = this.value();
        }
        if (typeof this.value === 'string') {
            this.calcString();
        }
        else {
            this.proxyValue();
        }
        if (this.isFinal()) {
            this.applyScale();
        }
        return this.outValue;
    }
    /**
     * Calculates string
     * Here we do not calc direct percent values as they supported natively since RN 43 (#32).
     * But keep calculating percent for operands when value defined as operation.
     */
    calcString() {
        let actions = [
            this.tryCalcOperation,
            this.isOperation ? this.tryCalcPercent : null,
            this.tryCalcVar,
            this.tryCalcRem,
        ].filter(Boolean);
        let value = this.tryActions(actions, this.value);
        if (value !== null) {
            this.outValue = value;
        }
        else {
            this.proxyValue();
        }
    }
    /**
     * Applies array of calculations to value. Stops on the first calculation that returns not null.
     * @param {Array} actions
     * @param {String} str
     */
    tryActions(actions, str) {
        // todo: use for.. of after https://github.com/facebook/react-native/issues/4676
        for (let i = 0; i < actions.length; i++) {
            let val = actions[i].call(this, str);
            if (val !== null) {
                return val;
            }
        }
        return null;
    }
    tryCalcOperation(str) {
        let opInfo = operation_1.default.isOperation(str);
        if (!opInfo) {
            return null;
        }
        this.isOperation = true;
        // todo: use for.. of after https://github.com/facebook/react-native/issues/4676
        const operands = ['v1', 'v2'];
        for (let i = 0; i < operands.length; i++) {
            const operand = operands[i];
            const operandValue = this.calcOperandValue(opInfo[operand]);
            if (operandValue !== null) {
                opInfo[operand] = operandValue;
            }
            else {
                // if we cant calculate operand - it is not operation, see #3
                return null;
            }
        }
        return operation_1.default.exec(opInfo);
    }
    calcOperandValue(str) {
        let actions = [
            this.tryCalcVar,
            this.tryCalcPercent,
            this.tryCalcRem,
            this.tryCalcFloat,
        ];
        return this.tryActions(actions, str);
    }
    tryCalcVar(str) {
        if (vars_1.default.isVar(str)) {
            let val = vars_1.default.calc(str, this.varsArr);
            if (this.stack.indexOf(str) >= 0) {
                throw new Error('Cyclic reference: ' + this.stack.concat([str]).join(' -> '));
            }
            const options = {
                stack: this.stack.concat([str]),
                isOperation: this.isOperation,
            };
            // recursive call because var can link to another var or percent/rem
            return new Value(val, str, this.varsArr, options).calc();
        }
        else {
            return null;
        }
    }
    /**
     * Tries calc percent
     */
    tryCalcPercent(str) {
        if (percent_1.default.isPercent(str)) {
            return percent_1.default.calc(str, this.prop);
        }
        return null;
    }
    /**
     * Tries calc rem
     */
    tryCalcRem(str) {
        if (rem_1.default.isRem(str)) {
            let remValue = vars_1.default.get('$rem', this.varsArr);
            return rem_1.default.calc(str, remValue);
        }
        else {
            return null;
        }
    }
    /**
     * Tries calc float value from string
     */
    tryCalcFloat(str) {
        let val = parseFloat(str);
        return !isNaN(val) ? val : null;
    }
    /**
     * Is it final calculation (not recursion)
     */
    isFinal() {
        return !this.stack.length;
    }
    /**
     * Just proxies value when no processing needed
     */
    proxyValue() {
        this.outValue = this.value;
    }
    applyScale() {
        // do not apply scale to variables, only for final numbers
        // otherwise scale will be applied several times
        if (vars_1.default.isVar(this.prop)) {
            return;
        }
        let scaleFactor = vars_1.default.get('$scale', this.varsArr) || 1;
        if (scaleFactor === 1) {
            return;
        }
        if (scale_1.default.isScalable(this.outValue, this.prop)) {
            this.outValue = scale_1.default.calc(this.outValue, scaleFactor);
        }
    }
}
exports.default = Value;