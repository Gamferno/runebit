import { execSync } from 'child_process';
const userCode = `def twoSum(nums, target):
    for i, n in enumerate(nums):
        diff = target - n
        if diff in nums[:i]:
            return [nums.index(diff), i]
`;
const testInput = "twoSum([2,7,11,15], 9)";
const wrapped = `${userCode}\nimport json\nresult = ${testInput}\nprint(json.dumps(result))`;
console.log(execSync(`python3 -c "${wrapped.replace(/"/g, '\\"')}"`).toString());
