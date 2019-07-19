Array.prototype.weightedRandom = function (p) {
    let arr = [];
    // console.log('trying to get rando array of',this, 'with property',p)
    if (!p || (!this[0][p] && this[0][p] !== 0) || typeof this[0][p] != "number") {
        console.log('Value was', p, 'Array was', this)
        throw new Error('Must specify numerical property!');
        return false;
    }
    if (this.length == 1) {
        return 0;
    } else {

        const max = Math.max(...this.map(q => q[p])),
            min = Math.min(...this.map(q => q[p]));
        this.forEach((it, n) => {
            /* percent btwn min and max: num-min/max-min */
            const num = Math.floor(100 * (it[p] - min) / (max - min));
            if (!!num) {
                arr = arr.concat(new Array(num).fill(n))
            }
        })
        // console.log('ARR would be',arr,max,min)
        if (min == max) {
            // console.log('All stronkz the same!',this.length,this[Math.floor(Math.random() * this.length)])
            return Math.floor(Math.random() * this.length)
        } else {
            return arr[Math.floor(Math.random() * arr.length)];
        }
    }

}
class Output {
    constructor(name, i, l) {
        this.name = name;
        this._id = Math.floor(Math.random() * 9999999999999999999).toString(32);
        this.outs = [];
        this.layer = l;
        this.num = i;
        this.isOn = false;
        this.inpNum = 0;
        this.inpLastTime = 0;
        this.isOut = true;
    }

}
class Neuron {
    constructor(x, y, i, l) {
        this.x = x; //percent width
        this.y = y; //percent height
        this._id = Math.floor(Math.random() * 9999999999999999999).toString(32);
        this.outs = [];
        this.layer = l || 0;
        this.isRetina = !l || l === 0;
        this.num = i;
        this.isOn = Math.random() > 0.9;
        this.inpNum = 0;
        this.inpLastTime = 0;
        this.isOut = false;
    }
    pickOut() {
        //pick (and return) a random target ID
        return this.outs[this.outs.weightedRandom('strength')];
    }
}
class Connection {
    constructor(s, t, l, p) {
        this.strength = p;
        this.from = s;
        this._id = Math.floor(Math.random() * 9999999999999999999).toString(32);
        this.targLayer = l;
        this.to = t; //id of destination neuron
    }
    // get strength() {
    //     return this._strength;
    // }
    // set strength(n) {
    //     if (n < 1 && n > 0) {
    //         this._strength = n;
    //     }
    //     return this._strength;
    // }
}
const mainComp = new Vue({
    data: {
        showBrain: false,
        brainReady:false,
        brain: {
            layers: [],
            // neurons: [],
            lastPath: []
        },
        brainTimer: null,
        isLearning: false,
        doneLearning: false,
        layers: 4,
        rounds: {
            total: 0, //total, cumulative rounds
            megaRepeatTotal: 5, //times to repeat the ENTIRE sequence
            megaRepeatCurr: 0,
            roundsPerImgCycle: 5, //rounds per individual cycle per image. So if image dog.jpg has 3 cycles, and this is 40, it'd have a total of 40*3=120 cycles
            roundsThisImageCycle: 0,
            imgCycles: 5, //number of total cycles that each image does
            currImgCycle: 0, //which of the above cycles (imgCycles) we're on
        },
        maxInputs: 0,
        allActive: [],
        maxNeuros: 800,
        numNeuros: 0,
        percCons: 50,
        drawOn: false,
        img: {
            w: 20,
            h: 20,
            data: null,
            filename: null,
            canv: document.getElementById('canv'),
            ctx: document.getElementById('canv').getContext("2d"),
            shouldBe: 'zero', //used for the learning check process. what SHOULD this image be?
        },
        score: {
            //number of times the current img cycle thinks this image is one of the following 
            one: 0,
            two: 0,
            three: 0,
            four: 0,
            five: 0,
            six: 0,
            seven: 0,
            eight: 0,
            nine: 0,
            zero: 0
        },
        totalScores: [0, 0],
        fList: {
            base: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
            one: '1',
            two: '2',
            three: '3',
            four: '4',
            five: '5',
            six: '6',
            seven: '7',
            eight: '8',
            nine: '9',
            zero: '0',
            current: [0, 0]
        },
        emergencyStop:false,
    },
    methods: {
        tryImg: function () {
            // this function will draw an image on a 20x20 canvas, run thru 100 'rounds' of brainCycle, then tell us what the brain thinks the image is.
            const sourcecanv = document.getElementById('drawCanv'),
                canv = document.getElementById('canv'),
                ctx = canv.getContext("2d"),
                self = this;
            ctx.drawImage(sourcecanv, 0, 0, 20, 20);
            self.brainTimer = setTimeout(function () {
                self.brainCycle(true);
            }, 50)
        },
        drawStuff: function (e) {
            if (this.drawOn) {
                const dcanv = document.getElementById('drawCanv'),
                    dctx = dcanv.getContext("2d");
                dctx.fillStyle = '#000';
                dctx.fillRect(e.offsetX - 2, e.offsetY - 2, 4, 4)
            }
        },
        nextFile: function (s) {
            const self = this;
            if (s) {
                //first file
                return './img/zero/1a0.png';
            }
            if (self.fList.current[1] == 5) {
                //at "end" of a particular number group
                self.fList.current[0]++;
                self.fList.current[1] = 0;
                if (self.fList.current[0] > 9 && self.rounds.megaRepeatCurr >= self.rounds.megaRepeatTotal) {
                    //finished "learning"!
                    self.isLearning=false;
                    return 'DONE';
                } else if (self.fList.current[0] > 9) {
                    self.rounds.megaRepeatCurr++;
                    self.fList.current = [0, 0];
                }
            } else {
                self.fList.current[1]++;
            }
            const base = self.fList.base[self.fList.current[0]]; //current examined number in 'word' form
            self.img.shouldBe = base;
            return `./img/${base}/${self.fList.current[1]+1}a${self.fList[base]}.png`
        },
        brainCycle: function (noLearn) {
            //this function runs one brain "cycle"
            const self = this;
            if(self.emergencyStop){
                self.emergencyStop=false;
                return false;
            }
            //do we need to replace img?
            // console.log('ROUNDS', self.rounds)
            if ((self.rounds.roundsThisImageCycle >= self.rounds.roundsPerImgCycle && self.rounds.currImgCycle >= self.rounds.imgCycles) || self.rounds.total === 0) {
                //either at beginning (NO rounds passed) OR
                //our current rounds this image 'cycle' is max, 
                //and we're at the last round, then
                //need to get a new image
                // console.log('need new image probly, rounds', self.rounds)
                self.rounds.total++;
                // console.log('Grabbing new image! Old one was', self.img.filename || 'nothing');
                self.rounds.roundsThisImageCycle = 0;
                if (noLearn) {
                    alert('Your scores are', self.score)
                }
                self.img.filename = self.nextFile(!self.img.data);
                if (self.img.filename == 'DONE') {
                    self.doneLearning = true;
                    return alert('Done learning (probly)!')
                }
                self.score = {
                    //number of times the current img cycle thinks this image is one of the following 
                    one: 0,
                    two: 0,
                    three: 0,
                    four: 0,
                    five: 0,
                    six: 0,
                    seven: 0,
                    eight: 0,
                    nine: 0,
                    zero: 0
                }
                self.rounds.currImgCycle = 0;
                return self.handleFile(self.img.filename);
            } else if (self.rounds.roundsThisImageCycle >= self.rounds.roundsPerImgCycle) {
                // console.log('same image, new cycle. Rounds', self.rounds)
                self.rounds.roundsThisImageCycle = 0;
                self.rounds.currImgCycle++;
                self.scoreCheck(self.score, self.img.shouldBe);
                if (noLearn) {
                    alert('Your scores are', self.score)
                }
                self.score = {
                    //number of times the current img cycle thinks this image is one of the following 
                    one: 0,
                    two: 0,
                    three: 0,
                    four: 0,
                    five: 0,
                    six: 0,
                    seven: 0,
                    eight: 0,
                    nine: 0,
                    zero: 0
                }
                return self.brainTimer = setTimeout(function () {
                    self.brainCycle(noLearn);
                }, 50);
            } else {
                //okay, now we know we have an image, and are not at the end of an image 'cycle'. Can continue with "brain" stuff
                // next, let's find out what the retina "sees"
                self.retina();

                self.rounds.roundsThisImageCycle++;

                //which neurons are currently active? save this so that we dont do stuff recursively
                self.allActive = self.brain.layers.map(ly => {
                    return ly.filter(na => !!na.isOn).map((q, i) => i);
                });
                // console.log('allActive',allActive);

                // go thru all neurons and set to default "no input" (they've not been "triggered" this round), and not on. Neurons that are in the list above will still send out a 'signal' to other neurons
                self.brain.layers.forEach(ly => {
                    ly.forEach(ne => {
                        // ne.hasInp = false;
                        ne.isOn = false;
                        ne.inpNum = 0;
                    })
                });
                //now for neurons that are currently on (.isOn==true), pick a random outgoing connection, and activate that neuron. Also, set that neuron to hasInp =true (since the neuron has had input )
                // console.log('before outgoing signals',self.allActive)
                self.allActive.forEach((ly, ln) => {
                    ly.forEach(ne => {
                        if (!!self.brain.layers[ln][ne].isOut) {
                            //'out' neurons do not send signals out themselves
                            return false;
                        }
                        let numOut = Math.random() > 0.95 ? 2 : 1; //need better way to choose this: should be dependent on incoming signal strength
                        if (self.maxInputs > 0) {
                            //if we've set the maxInputs number
                            // console.log('maxInps',self.maxInputs,ne.inpLastTime)
                            // numOut = ne.inpLastTime>=0.5*self.maxInputs?2:1;
                            numOut = ne.inpLastTime > 1 || Math.random() > 0.965 ? 2 : 1;
                        }
                        // console.log('LAYER STUFF',ly,ln,ne,self.brain.layers[ln])
                        //pick 1 or 2 random targets. These are CONNECTIONS, not the actual targets!
                        let targs = new Array(numOut).fill(100).map(q => self.brain.layers[ln][ne].pickOut());
                        // console.log('targs', targs)
                        let targNe = targs.map(targ => {
                            self.brain.lastPath.push([ln, ne, targ._id]);
                            return self.brain.layers[targ.targLayer].find(nt => nt._id == targ.to)
                        });
                        if (!!targNe.filter(te => !te).length) {
                            // console.log(targ,ne,ln)
                            throw new Error('Cannot find target neuron!');
                        }
                        targNe.forEach(t => {
                            t.isOn = true;
                            if (t.isOut) {
                                //this is an output;
                                self.score[t.name]++;
                            }
                            t.inpNum++;
                            // t.hasInp=true;
                        })

                    })
                });
                self.brain.layers.forEach(ly => {
                    ly.forEach(ne => {
                        // ne.hasInp = false;
                        // if(ne.inpNum) console.log('NUM INPUTS',ne.inpNum,self.maxInputs)
                        ne.inpLastTime = ne.inpNum || 0;
                    })
                });
                self.rounds.total++;
                if (self.rounds.total > 10) {
                    let maxInp = Math.max(...self.brain.layers.map(ly => {
                        return Math.max(...ly.map(q => q.inpNum));
                    }));
                    if (self.maxInputs < maxInp) {
                        self.maxInputs = maxInp;
                    }
                }
                const totalActive = self.allActive.reduce((a, b) => ({
                    length: a.length + b.length
                }));

                //check for 'death' conditions

                if (!totalActive.length) {
                    //brain death!
                    clearInterval(self.brainTimer);
                    alert('Brain death!')
                }
                if (totalActive.length >= 0.95 * self.numNeuros) {
                    clearInterval(self.brainTimer);
                    alert('Death due to overbraining')
                }

                // check score! if we're NOT learning, skip this
                //finally, do another round (assuming everything is ok!)
                self.brainTimer = setTimeout(function () {
                    self.brainCycle(noLearn);
                }, 50)

            }
        },
        learn: function () {
            const self = this;
            self.isLearning = true;
            //starts learn timer with noLearn set to false
            self.brainTimer = setTimeout(function () {
                self.brainCycle();
            }, 50);
        },
        handleFile: function (f) {
            const self = this;
            //TEMPORARY
            self.img.data = 'HAZ STUFF';
            const pic = new Image(),
                canv = document.getElementById('canv'),
                ctx = canv.getContext("2d");
            // f = 'http://lorempixel.com/100/100/nature/'
            pic.onload = function () {
                // console.log('NEW IMAGE DIMS',img.width,img.height);
                // self.img.w = pic.width;
                // self.img.h = pic.height;
                ctx.drawImage(pic, 0, 0, 20, 20);
                // console.log('New image is', pic, 'and is going on canvas', self.img.canv, 'with context', self.img.ctx, 'complete?', pic.complete)

                self.scoreCheck(self.score, self.img.shouldBe)
                self.brainTimer = setTimeout(function () {
                    self.brainCycle();
                }, 50)
            }
            pic.crossOrigin = "Anonymous";
            pic.src = f;
            pic.onerror = function (e) {
                console.log('img load error!', e)
            }
            //load file, then...
            // self.img.data = self.ctx.getImageData(0,0,self.canvas.width,self.canvas.height)
        },
        retina: function () {
            //function turns all first-layer ('retina') neurons on as appropriate based on color
            const self = this,
                canv = document.getElementById('canv'),
                ctx = canv.getContext("2d"),
                imgData = ctx.getImageData(0, 0, canv.width, canv.height);
            self.brain.layers[0].forEach((ne, n) => {
                let thisPx = {
                    r: imgData.data[n * 4],
                    g: (imgData.data[n * 4]) + 1,
                    b: (imgData.data[n * 4]) + 2,
                    l: 0
                }
                thisPx.l = (0.299 * thisPx.r + 0.587 * thisPx.g + 0.114 * thisPx.b) / 255;
                ne.isOn = thisPx.l < 0.5;
            })
        },
        scoreCheck: function (s, t) {
            const names = Object.keys(s),
                self = this,
                maxScore = Math.max(...names.map(q => s[q])),
                maxScoreName = names.filter(q => s[q] == maxScore);
            // console.log('max score at this round was',maxScoreName)
            let scoreChange = 1;
            if (maxScoreName == t) {
                //increase scores
                scoreChange = 0.01;
                self.totalScores[0]++;
            } else {
                //decrease scores,
                scoreChange = -0.01;
                self.totalScores[1]++;
            }
            // console.log('Last round was',result)
            self.brain.lastPath.forEach(lpi => {
                // console.log('trying to adjust score of path',lpi)
                let theNeur = self.brain.layers[lpi[0]][lpi[1]], //source neuron
                    theCon = theNeur.outs.find(q => q._id == lpi[2]);
                if (!!theCon) {
                    theCon.strength += scoreChange
                }
            });
            //reset brain path for this round
            console.log('Clearing brain. Image Repeat', self.rounds.roundsThisImageCycle, 'of', self.rounds.roundsPerImgCycle, 'and filename', self.img.filename)
            self.brain.lastPath = [];
        },
        createBrain:function(){
            if(this.brainReady){
                const okayReplace = confirm('Are you sure you wish to replace the current brain?');
                if(!!okayReplace){
                    this.setupBrain();
                }
                return false;
            }
            this.setupBrain();
        },
        setupBrain: function () {
            //for now, let's just do 500 neurons with 50% connect rate:
            const self = this;
            console.log('self',self)
            self.brain.layers=[];
            self.brain.layers[0] = new Array(self.img.w * self.img.h).fill(100).map((q, i) => new Neuron(Math.random() * 100, Math.random() * 100, i, 0));
            self.numNeuros = self.img.w * self.img.h;
            const perLayer = Math.floor(((self.maxNeuros - self.numNeuros) / self.layers)); //note: this is every layer BUT the initial one!
            let a = 1;
            for (a; a < self.layers; a++) {
                self.brain.layers[a] = new Array(perLayer).fill(100).map((q, i) => new Neuron(Math.random() * 100, Math.random() * 100, i, a));
                self.numNeuros += perLayer;
            }

            //make output fields (one for each possible digit):
            self.brain.layers.push(new Array(self.fList.base.length).fill(100).map((q, i) => new Output(self.fList.base[i], i, self.brain.layers.length)))

            const maxCons = self.maxNeuros * self.percCons / 100;
            for (let b = 0; b < self.layers; b++) {
                let otherLayers = new Array(self.layers + 1).fill(100).map((q, i) => i).filter(n => !!n && n != b);
                console.log('Other Layers', otherLayers, b)
                self.brain.layers[b].forEach((n, nn) => {
                    console.log(`Connecting Neuron ${nn} of ${!!b?perLayer:self.img.w*self.img.h} for layer ${b+1} of ${self.layers+1}`)
                    //for each neuron (or retinal cell) in this layer, pick another
                    var numCons = Math.ceil(Math.random() * maxCons),
                        doneIds = [];
                    for (c = 0; c < numCons; c++) {
                        //for each connection, pick a random OTHER layer
                        let ol = otherLayers[Math.floor(Math.random() * otherLayers.length)], //pick a random other layer
                            olNeurs = self.brain.layers[ol].filter(q => !doneIds.includes(q._id)), //filter out all targets on that layer that have already been picked
                            targ = olNeurs[Math.floor(Math.random() * olNeurs.length)];
                        // console.log(olNeurs.length,self.brain.layers[ol].length,ol,otherLayers)
                        // while (targ == -1 || doneIds.includes(self.brain.layers[ol][targ]._id)) {
                        //     targ = Math.floor(Math.random() * numOl);
                        //     console.log('DONE IDS FOR NEURON',nn,'ARE',doneIds)
                        // }
                        if (targ) {
                            n.outs.push(new Connection(n._id, targ._id, ol, 0.1))
                            doneIds.push(targ._id);
                        }

                    }
                })
            }
            console.log(self)
            //end setup
            self.brainReady = true;
        }
    },
    created: function () {
        //function runs when vue model first instantiated

    },
    computed: {
        totalNeuros:function(){
            return Math.ceil(this.maxNeuros*this.maxNeuros*this.percCons/100);
        }
    }
}).$mount('#main')