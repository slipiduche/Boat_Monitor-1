const jwt = require('jsonwebtoken');

function isDigit(char)
{
    if(char >= '0' && char <= '9')
        return true;
    else
        return false;
}

function NaNFinder(str)
{
    if(str)
    {
        let pos = str.length - 2;

        let r = null;
    
        for(let i = pos; i > 0; i--)
        {
            if(!isDigit(str[i]))
            {
                r = i;
    
                break;
            }
        }
        
        console.log(r);
        console.log(token.length)
        if(r != null && r <= str.length - 3)
        {
            let id = str.slice(r + 1, str.length - 2);
            console.log(id)
            let token = str.slice(0,r);

            return [token,parseInt(id)];
        }
        else
            return [null,null];
    }

}

var token = jwt.sign({ foo: 'bar' }, 'shhhhh',{ expiresIn: 60 * 60 });
 token += "[" + 2 + "%";

console.log(token);

let id;

[token,id] = NaNFinder(token);

console.log("id: " + id);

console.log(token);

var token2 = jwt.verify(token,'shhhhh');

console.log(id);
console.log(token2);