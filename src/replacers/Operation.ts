/**
 * Detects operation in string
 * Supports: '*', '+', '-'
 */

type Operator = (v1: number, v2: number) => number;

const operators: {
    [key: string]: Operator;
} = {
    '*': (v1, v2) => v1 * v2,
    '+': (v1, v2) => v1 + v2,
    '-': (v1, v2) => v1 - v2,
    '/': (v1, v2) => v1 / v2,
};

export default {
    isOperation,
    exec,
};

/**
 * Is operation in string: '0.25 * $abc' => {operator: '*', v1: '0.25', v2: '$abc'}
 * @param {String} str
 */
function isOperation(str) {
    let opInfo = findOperator(str);
    if (opInfo) {
        const v1 = str.substr(0, opInfo.pos).trim();
        const v2 = str.substr(opInfo.pos + 1).trim();
        return {
            v1,
            v2,
            operator: opInfo.operator,
        };
    } else {
        return false;
    }
}

/**
 * Executes operation
 * @param {Object} opInfo
 */
function exec(opInfo) {
    assertOperator(opInfo.operator);
    assertValue(opInfo.v1);
    assertValue(opInfo.v2);
    if (opInfo.operator === '/') {
        assertDivisor(opInfo.v2);
    }
    let fn = operators[opInfo.operator];
    return fn(opInfo.v1, opInfo.v2);
}

type FindOperatorResult = {
    operator: string;
    pos: number;
};

function findOperator(str): FindOperatorResult {
    for (let operator in operators) {
        let pos = str.indexOf(operator);
        if (pos >= 0) {
            return { operator, pos };
        }
    }
}

function assertOperator(operator) {
    if (!operators[operator]) {
        throw new Error('Unknown operator: ' + operator);
    }
}

function assertValue(value) {
    if (typeof value !== 'number') {
        throw new Error(
            'Operation value should be number, you try: ' + String(value)
        );
    }
}

function assertDivisor(divisor) {
    if (divisor === 0) {
        throw new Error('Operation divisor should not be zero');
    }
}
