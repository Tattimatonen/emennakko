import React from 'react';
import axios from 'axios';
import {withStyles} from "@material-ui/core";

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import Clear from '@material-ui/icons/Clear';

class Trains extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            station: "",
            stationCode: "",
            stations: [],
            arrivals: [],
            departures: [],
            tabValue: 0,
        }
    }

    //haetaan tässä vaiheessa tiedot asemien nimien käsittelyyn
    componentDidMount() {
        axios.get('https://rata.digitraffic.fi/api/v1/metadata/stations')
            .then(response => {
                this.setState({
                    stations: response.data
                });
            });
    }

    handleClickClear = () => {
        //console.log(this.getIdx(this.state.arrivals[0], this.state.stationCode));
        this.setState({ station: "", stationCode: "", arrivals: [], departures: [] });
    };

    handleTabChange = (event, tabValue) => {
        this.setState({ tabValue });
    };

    handleStationChange = station => event => {
        this.setState({
            [station]: event.target.value,
            stationCode: this.stationToCode(event.target.value),
        }, () => {
            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=50&departed_trains=0&departing_trains=0&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(train) {
                        //ei rahtijunia, vetureita eikä vaihtotyötä, oletuksena softa on matkustajille
                        return train.trainCategory !== "Cargo" && train.trainCategory !== "Locomotive" && train.trainCategory !== "Shunting";
                    });

                    let filteredAndSorted = this.sortTrains(filtered, this.state.stationCode);
                    console.log(filteredAndSorted);

                    this.setState({
                        arrivals: filtered
                    });
                });

            axios.get('https://rata.digitraffic.fi/api/v1/live-trains/station/' + this.state.stationCode + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=50&include_nonstopping=false')
                .then(response => {

                    let filtered = response.data.filter(function(train) {
                        return train.trainCategory !== "Cargo" && train.trainCategory !== "Locomotive" && train.trainCategory !== "Shunting";
                    });

                    this.setState({
                        departures: filtered
                    });
                });
        });
    };

    //ottaa syötteenä aseman nimen ja palauttaa sen asemakoodin
    stationToCode(station) {
        for (let i = 0; i < this.state.stations.length; i++) {
            if (this.state.stations[i].stationName.split(" ")[0].toLowerCase() === station.toLowerCase()) {
                return this.state.stations[i].stationShortCode;
            }
        }
    }

    //ottaa syötteenä aseman koodin ja palauttaa sen nimen
    codeToStation(stationCode) {
        for (let i = 0; i < this.state.stations.length; i++) {
            if (this.state.stations[i].stationShortCode === stationCode) {
                //splitataan, jotta päästään eroon lopun mahdollisista "asema" tai "ratapiha" -päätteistä, joita esimerkissä ei ollut
                return this.state.stations[i].stationName.split(" ")[0];
            }
        }
    }

    //palauttaa indeksin, jossa juna on tietyllä asemalla sen aikataulutiedoissa
    getIdx(train, stationCode) {
        for (let i = 0; i < train.timeTableRows.length; i++) {
            //matchataan oikea asema (se, joka on hakukentässä)
            if (train.timeTableRows[i].stationShortCode === stationCode) {
                return i;
            }
        }
    }

    //lajitellaan haetut junat uudelleen nousevan saapumis/lähtemisajan määrätylle asemalle perusteella
    sortTrains(trainArray, stationCode) {

        //simppeli bubblesort
        /**for (let i = 0; i < trainArray.length; i++) {
            for (let j = 0; j < (trainArray.length - i - 1); j++) {
                if((trainArray[j].timeTableRows[this.getIdx(trainArray[j], stationCode)].scheduledTime) > (trainArray[j+1].timeTableRows[this.getIdx(trainArray[j], stationCode)].scheduledTime)) {
                    var tmp = trainArray[j];
                    trainArray[j] = trainArray[j+1];
                    trainArray[j+1] = tmp;
                }
            }
        }**/

        trainArray.sort(function(a,b) {
            if (a.timeTableRows[0].scheduledTime < b.timeTableRows[0].scheduledTime) {
                return -1;
            }
            else if (a.timeTableRows[0].scheduledTime > b.timeTableRows[0].scheduledTime) {
                return 1;
            }
            else {
                return 0;
            }
        });

        return trainArray;
    }

    //palauttaa true, jos juna on peruttu ja false, jos ei
    isCancelled(trainNumber, type) {
        let trainArray;

        if (type === "ARRIVAL") {
            trainArray = this.state.arrivals;
        }
        else {
            trainArray = this.state.departures;
        }

        for (let i = 0; i < trainArray.length; i++) {
            //matchataan junan numero siihen, jonka perumistietoja haetaan
            if (trainArray[i].trainNumber === trainNumber) {
                let train = trainArray[i];
                return train.cancelled;
            }
        }
    }

    //aikataulun mukainen aikatauluhaku saapuville junille, entä live estimate + jos cancelled
    getTime(trainNumber, stationCode, type, scheduled) {
        let trainArray;
        if (type === "ARRIVAL") {
            trainArray = this.state.arrivals;
        }
        else {
            trainArray = this.state.departures;
        }

        for (let i = 0; i < trainArray.length; i++) {
            //matchataan junan numero (oletettavasti uniikki) siihen, jonka aikatauluja haetaan
            if (trainArray[i].trainNumber === trainNumber) {
                let train = trainArray[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {
                    //matchataan oikea asema (se, joka on hakukentässä) ja katsotaan, että aikataulutiedon tyyppi on oikea
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {
                        if (scheduled === true) {
                            if(this.isLate(trainNumber, stationCode, type)) {
                                let sliced = (train.timeTableRows[j].scheduledTime).slice(11, 16);
                                return "(" + sliced + ")";
                            }
                            else {
                                return (train.timeTableRows[j].scheduledTime).slice(11, 16);
                            }
                        }
                        else if (train.timeTableRows[j].liveEstimateTime && (train.timeTableRows[j].differenceInMinutes > 0)) {
                            return (train.timeTableRows[j].liveEstimateTime).slice(11, 16);
                            //pelkillä minuuteilla sliced: (train.timeTableRows[j].liveEstimateTime).slice(0, 17) + (train.timeTableRows[j].liveEstimateTime).slice(21);
                        }
                    }
                }
            }
        }
        return "";
    }

    //palauttaa true, jos haettu juna saapuu/lähtee myöhässä annetulla asemalla; false jos ei
    isLate(trainNumber, stationCode, type) {
        let trainArray;
        if (type === "ARRIVAL") {
            trainArray = this.state.arrivals;
        }
        else {
            trainArray = this.state.departures;
        }

        for (var i = 0; i < trainArray.length; i++) {
            //matchataan junan numero siihen, jonka aikatauluja haetaan
            if (trainArray[i].trainNumber === trainNumber) {
                let train = trainArray[i];
                for (let j = 0; j < train.timeTableRows.length; j++) {
                    //matchataan oikea asema ja katsotaan, että aikataulutiedon tyyppi on oikea
                    if (train.timeTableRows[j].stationShortCode === stationCode && train.timeTableRows[j].type === type) {
                        if (train.timeTableRows[j].liveEstimateTime && (train.timeTableRows[j].differenceInMinutes > 0)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    render() {
        const {classes} = this.props;
        const {tabValue} = this.state;
        const {arrivals} = this.state;
        const {departures} = this.state;

        return(
            <div>
                <div>
                    <p className={classes.text}>
                        <b>Hae aseman nimellä</b>
                    </p>
                    <form noValidate autoComplete="off">
                        <TextField
                            id="search"
                            className={classes.search}
                            value={this.state.station}
                            onChange={this.handleStationChange('station')}
                            margin="dense"
                            variant="outlined"
                            InputProps={{
                                classes: {
                                root: classes.searchFocused,
                                focused: classes.focused,
                                notchedOutline: classes.outlined,
                                },
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={this.handleClickClear}
                                            className={classes.clear}
                                        >
                                            <Clear/>
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </form>
                </div>

                <div className={classes.root}>
                    <Tabs
                        value={tabValue}
                        onChange={this.handleTabChange}
                        classes={{root: classes.tabsRoot, indicator: classes.tabsIndicator}}
                    >
                        <Tab
                            label="Saapuvat"
                            disableRipple
                            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
                        />
                        <Tab
                            label="Lähtevät"
                            disableRipple
                            classes={{ root: classes.tabRoot, selected: classes.tabSelected }}
                        />
                    </Tabs>
                </div>

                {tabValue === 0 && <TabContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Juna</TableCell>
                                <TableCell>Lähtöasema</TableCell>
                                <TableCell>Pääteasema</TableCell>
                                <TableCell>Saapuu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{
                            arrivals.slice(0, 10).map( row => (
                                <TableRow className={this.isCancelled(row.trainNumber, "ARRIVAL") ? classes.rowCancelled : classes.row} key={row.trainNumber} >
                                    <TableCell>{row.trainType + ' ' + row.trainNumber}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[0].stationShortCode)}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[row.timeTableRows.length-1].stationShortCode)}</TableCell>
                                    <TableCell>
                                        <div className={classes.liveTime}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "ARRIVAL", false)}
                                        </div>
                                        <div className={this.isLate(row.trainNumber, this.state.stationCode, "ARRIVAL") ? classes.lateTrain : classes.onTimeTrain}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "ARRIVAL", true)}
                                        </div>
                                        <div className={classes.cancelled}>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        }</TableBody>
                    </Table>
                </TabContainer>}

                {tabValue === 1 && <TabContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Juna</TableCell>
                                <TableCell>Lähtöasema</TableCell>
                                <TableCell>Pääteasema</TableCell>
                                <TableCell>Lähtee</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>{
                            departures.slice(0, 10).map( row => (
                                <TableRow className={this.isCancelled(row.trainNumber, "DEPARTURE") ? classes.rowCancelled : classes.row} key={row.trainNumber} >
                                    <TableCell>{row.trainType + ' ' + row.trainNumber}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[0].stationShortCode)}</TableCell>
                                    <TableCell>{this.codeToStation(row.timeTableRows[row.timeTableRows.length-1].stationShortCode)}</TableCell>
                                    <TableCell>
                                        <div className={classes.liveTime}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "DEPARTURE", false)}
                                        </div>
                                        <div className={this.isLate(row.trainNumber, this.state.stationCode, "DEPARTURE") ? classes.lateTrain : classes.onTimeTrain}>
                                            {this.getTime(row.trainNumber, this.state.stationCode, "DEPARTURE", true)}
                                        </div>
                                        <div className={classes.cancelled}>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        }</TableBody>
                    </Table>
                </TabContainer>}

            </div>
        )
    }
}

const styles = () => ({
    row: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#f3f3f3',
        },
    },
    rowCancelled: {
        '&:nth-of-type(odd)': {
            backgroundColor: '#f3f3f3',
        },
        color: '#444444',
    },
    text: {
        margin: 20,
        marginBottom: 0,
    },
    onTimeTrain: {
    },
    lateTrain: {
        fontSize: 11,
    },
    liveTime: {
        color: '#FF0000',
    },
    search: {
        marginLeft: 20,
        marginBottom: 40,
        backgroundColor: '#f3f3f3',
    },
    focused: {},
    outlined: {},
    searchFocused: {
        '&$focused $outlined': {
            borderColor: '#000000',
            borderWidth: 1,
        },
    },
    root: {
        flexGrow: 1,
    },
    clear: {
        marginRight: 0,
    },
    tabsRoot: {
        borderBottom: '1px solid #e8e8e8',
        //tähän aukko aktiivisen tabin kohdalle?
    },
    tabsIndicator: {
        backgroundColor: '#000000',
        //height: '1px',
    },
    tabRoot: {
        textTransform: 'initial',
        minWidth: 72,
        color: '#35852a',
        '&:nth-of-type(odd)': {
            marginLeft: 20,
        },
        '&:hover': {
            color: '#000000',
            opacity: 1,
        },
        '&$tabSelected': {
            color: '#000000',
            borderTop: '1px solid #e8e8e8',
            borderLeft: '1px solid #e8e8e8',
            borderRight: '1px solid #e8e8e8',
            borderRadius: '10px 10px 0px 0px',
        },
        '&:focus': {
            color: '#000000',
            opacity: 1,
        },
    },
    tabSelected: {},
});

function TabContainer(props) {
    return (
        <div>
            {props.children}
        </div>
    );
}

export default withStyles(styles)(Trains);