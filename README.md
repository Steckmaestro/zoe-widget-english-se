### Acknowledgements

This snippet is based on the code from Tobias Battenberg (https://gist.github.com/mountbatt)
Original code: https://gist.github.com/mountbatt/772e4512089802a2aa2622058dd1ded7

## Disclaimer

MIT
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

THIS SOFTWARE CAN STOP WORKING AT ANY TIME DUE TO CHANGES IN EXTERNAL APIS OR FOR OTHER REASON. I TAKE NO RESPONSIBILITY AND HAVE NO AMBITION TO MAINTAIN THIS SOFTWARE.

### Follow this guide

#### Requirements

- IOS 14
- My Renault Account (email, password)
- VIN (Required if you have multiple cars, might add functionality)

Tested with Iphone 12 and IOS 14.

**How the final thing will look if it all goes well**

![Screenshot of Final Version](/assets/final.png)

##### 1. Download and install Scriptable

![Screenshot of Scriptable](/assets/scriptable.png)

##### 2. Visit GitHub (see link below) open the script, click raw and copy all of it (on your phone).

https://github.com/Steckmaestro/zoe-widget-english-se/blob/main/zoe-widget.js

![Screenshot of Raw Button](/assets/raw.jpg)

![Screenshot of Copy](/assets/copy.png)

##### 3. Open Scriptable and click the add new script button

![Screenshot of Add Script](/assets/add-script.jpg)

##### 4. Paste in your code (the one you copied from step 2)

##### 5. Change variables myRenaultUser, myRenaultPass, ZOE_Phase, mapProvider and VIN. Leave the others. Then press Done.

In Javascript you define a variable as follows
let MyVariable = "myValue";

Make sure to only change and put in your values between the "" symbols. Like so.

```
let myRenaultUser = "minepost@telia.se" 	// email
let myRenaultPass = "mittpassword12345" 	// password
...

let ZOE_Phase = "2" // "1" or "2"

// should we use apple-maps or google maps?
let mapProvider = "apple" // "apple" or "google"

let VIN = "VF1..." // starts with VF1... enter like this: "VF1XXXXXXXXX"
```

##### 6. Give your Script a good name if you want

##### 7. Goto your home screen and hold down your finger until you can press the + button and add Widget. Select Scriptable. 

![Screenshot of Add Widget](/assets/add-widget.png)

##### 8. Add your script and select a nice size. Change the settings as you wish, run it and if you're lucky you have the same screen as I do.

![Screenshot of Select Size](/assets/select-size.png)

### Done.