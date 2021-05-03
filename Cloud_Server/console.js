let mod = "cat";

let str = `I am your ${mod}`;

console.log(str);


let s = "!@#$%^&*()_-=+/*{}[]\"';,<>.?"

console.log("Length: " + s.length);


function isDigit(char)
{
    if(char >= '0' && char <= '9')
        return true;
    else
        return false;
}

console.log(isDigit('A'))