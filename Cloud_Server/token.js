function isDigit(char)
{
    if(char >= '0' && char <= '9') //if it is a numerical symbol
        return true;
    else
        return false;
}

function NaNFinder(str)
{
    if(str)
    {
        let pos = str.length - 2; //starts at the last position of the string - 1 (should be the last digit of the id)

        let r = null;
    
        for(let i = pos; i > 0; i--) //start searching for another symbol, starting from the last digit of the id and going backwards
        {
            if(!isDigit(str[i])) //if something that's not a numerical symbol is detected
            {
                r = i; //save its position
    
                break; //exit the loop
            }
        }
        
        console.log(r);

        console.log(token.length);
        
        if(r != null && r <= str.length - 3) //if the position was found, and there is at least 1 digit to call id 
        {
            let id = str.slice(r + 1, str.length - 2); //Extract the id given known possition of symbols enclosing it
            
            console.log(id);
            
            let token = str.slice(0,r); //Remove id and symbols enclosing it to get the token

            return [token,parseInt(id)]; //return token and id (id is converted to integer)
        }
        else
            return [null,null];
    }

}