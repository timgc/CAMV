const fs = require('fs');
const util = require('util');

var ViewBox = React.createClass({
  getInitialState: function(){
    return {selectedRun: null, 
            selectedSearch:null,
            submitted: false, 
            selectedProtein: null,
            selectedPeptide: null,
            selectedScan: null,
            selectedPTMPlacement: null,
            selectedMz: null,
            currentLabel: null,
            fragmentSelectionModalIsOpen: false,
            fragmentMatches: [],
            maxPPM: 100,
            minMZ: 0,
            maxMZ: null,
            //data: allData.fullTestData,
            data: [],
            //peptideData: allData.peptideData
            peptideData: []
    }
  },

  updateSelectedProtein: function(proteinId){
    this.setState({selectedProtein: proteinId})
  },
  updateSelectedPeptide: function(peptideId){
    this.setState({selectedPeptide: peptideId})
  },
  updateSelectedScan: function(scanId){
    this.setState({selectedScan: scanId, minMZ: 0, maxMZ: null})
  },
  updateSelectedPTMPlacement: function(modsId){
    this.setState({selectedPTMPlacement: modsId})
  },
  updateMinMZ: function(newMinMZ){
    if (newMinMZ > 0){
      this.setState({minMZ: newMinMZ})
    } else {
      this.setState({minMZ: 0})
    }
  },
  updateMaxMZ: function(newMaxMZ){
    if (newMaxMZ > this.state.minMZ){
      this.setState({maxMZ: newMaxMZ})
    }
  },

  updateSelectedMz: function(mz){
    data = this.state.data[this.state.selectedProtein].peptides[this.state.selectedPeptide].scans[this.state.selectedScan].scanData
    peptide = this.state.data[this.state.selectedProtein].peptides[this.state.selectedPeptide]
    peptideDataId = peptide.peptideDataId
    modificationStateId = peptide.modificationStateId
    scan = peptide.scans[this.state.selectedScan]

    matchData = this.state.peptideData[peptideDataId]
                          .modificationStates[modificationStateId]
                          .mods[this.state.selectedPTMPlacement]
                          .matchData

    currentLabel = ''

    matchId = data.find(function(peak){return (peak.mz === mz)}).matchInfo[this.state.selectedPTMPlacement].matchId
    
    if (matchId){ currentLabel = matchData[matchId].name }

    matches = matchData.filter(function(item){
      ppm = (item.mz - mz) / mz * 1000000
      item.ppm = ppm
      return Math.abs(ppm) < this.state.maxPPM
    }.bind(this))  
    
    this.setState({selectedMz: mz, 
                   fragmentSelectionModalIsOpen: true,
                   fragmentMatches: matches,
                   currentLabel: currentLabel})
  },


  closeFragmentSelectionModal: function(){
    this.setState({fragmentSelectionModalIsOpen: false,
                   fragmentMatches: [],
                   selectedMz: null,
                   currentLabel: ''})
  },
  updateSelectedFragment: function(matchId){
    if (this.state.selectedProtein != null && 
        this.state.selectedPeptide != null &&
        this.state.selectedScan != null &&
        this.state.selectedMz != null) {
      data = _.cloneDeep(this.state.data)
      
      scan = data[this.state.selectedProtein]
              .peptides[this.state.selectedPeptide]
              .scans[this.state.selectedScan]
      scanData = scan.scanData
      
      matchData = this.state.peptideData[peptide.peptideDataId]
                    .modificationStates[peptide.modificationStateId]
                    .mods[this.state.selectedPTMPlacement]
                    .matchData

      scanData.forEach(function(peak){
        if (peak.mz === this.state.selectedMz){
          peak.matchInfo[this.state.selectedPTMPlacement].matchId = matchId
          currentLabel = matchData[matchId].name
          this.setState({ currentLabel: currentLabel})
        }
      }.bind(this))
      this.setState({data: data})
    }
  },

  updateChoice: function(choice){
    data = _.cloneDeep(this.state.data)
    scan = data[this.state.selectedProtein].peptides[this.state.selectedPeptide].scans[this.state.selectedScan]
    choiceData = scan.choiceData
    choiceData[this.state.selectedPTMPlacement].state = choice
    this.setState({data: data})
  },

  componentDidUpdate: function(prevProps, prevState){
    if (prevState.selectedRun != this.state.selectedRun){
      // console.log('New run: ' + this.state.selectedRun)
    }
    if (prevState.selectedSearch != this.state.selectedSearch){
      // console.log('New search: ' + this.state.selectedSearch)
    }
  },
  goButtonClicked: function(){
    this.setState({submitted: true})
  },
  setData: function(data){
    this.setState({data: data})
  },
  setPeptideData: function(peptideData){
    this.setState({peptideData: peptideData})
  },
  setSubmitted: function(submitted){
    this.setState({submitted: submitted})
  },
  save: function(){
    // console.log('saving...')

    var dataToSave = JSON.stringify({scanData: this.state.data, peptideData: this.state.peptideData}, null, 2)
    dialog.showSaveDialog({filters: [{name: 'text', extensions: ['camv']}]},function(fileName) {
      if (fileName === undefined) return;
      var dataToSave = JSON.stringify({scanData: this.state.data, peptideData: this.state.peptideData}, null, 2)
      var ws = fs.createWriteStream('testDataOut.camv');
      ws.on('error', function(err){
        dialog.showErrorBox("File Save Error", err.message);
      });
      ws.on('finish', function(){
          dialog.showMessageBox({ message: "The file has been saved!", buttons: ["OK"]});
      });
      var lines = dataToSave.split("\n");
      for (i = 0; i < lines.length; i++){
        ws.write(lines[i] + "\n")
      }
      ws.end();
    }.bind(this));
  },

  render: function() {
    var spectrumData = []
    var precursorSpectrumData = []
    var precursorMz = null
    var quantSpectrumData = []
    var quantMz = null
    var chargeState = null
    var matchData = []
    var bFound = []
    var yFound = []
    var protein = null
    var peptide = null
    var scan = null
    var choice = null
    var peptideSequence = null
    var inputDisabled = true
    if (this.state.selectedProtein != null) {
      protein = this.state.data[this.state.selectedProtein]
      if (this.state.selectedPeptide != null) {
        peptide = protein.peptides[this.state.selectedPeptide]
        if (this.state.selectedScan != null){
          scan = peptide.scans[this.state.selectedScan]
          spectrumData = scan.scanData
          precursorSpectrumData = scan.precursorScanData
          precursorMz = scan.precursorMz
          chargeState = scan.chargeState
          quantSpectrumData = scan.quantScanData
          quantMz = scan.quantMz
          if (this.state.selectedPTMPlacement != null){
            inputDisabled = false
            mod = this.state.peptideData[peptide.peptideDataId]
                    .modificationStates[peptide.modificationStateId]
                    .mods[this.state.selectedPTMPlacement]
            matchData = mod.matchData
            peptideSequence = mod.name

            spectrumData.forEach(function(peak){
              var matchId = peak.matchInfo[this.state.selectedPTMPlacement].matchId
              if (matchId){
                if (matchData[matchId].ionType == 'b'){
                  bFound.push(matchData[matchId].ionPosition)
                } else if (matchData[matchId].ionType == 'y'){
                  yFound.push(matchData[matchId].ionPosition)
                }
              }
            }.bind(this))
          }
        }
      }
    }
    
//    console.log("selectedProtein:", this.state.selectedProtein, "selectedPeptide:", this.state.selectedPeptide, "selectedScan:", this.state.selectedScan, "selecedPTMPlacement:", this.state.selectedPTMPlacement)


    return (
      <div className="panel panel-default" id="viewBox">
        <ModalFragmentBox showModal={this.state.fragmentSelectionModalIsOpen}
                          closeCallback={this.closeFragmentSelectionModal}
                          updateCallback={this.updateSelectedFragment}
                          mz={this.state.selectedMz}
                          fragmentMatches={this.state.fragmentMatches} 
                          currentLabel={this.state.currentLabel}/>
        <ModalFileSelectionBox showModal={!this.state.submitted} 
                               setPeptideData={this.setPeptideData}
                               setData={this.setData}
                               setSubmitted={this.setSubmitted}/>

        <div className="panel panel-default" id="scanSelectionList">
          <ScanSelectionList data={this.state.data}
                             peptideData={this.state.peptideData}
                             updateSelectedProteinCallback={this.updateSelectedProtein}
                             updateSelectedPeptideCallback={this.updateSelectedPeptide}
                             updateSelectedScanCallback={this.updateSelectedScan}
                             updateSelectedPTMPlacementCallback={this.updateSelectedPTMPlacement}
                             selectedProtein={this.state.selectedProtein}
                             selectedPeptide={this.state.selectedPeptide}
                             selectedScan={this.state.selectedScan}
                             selectedPTMPlacement={this.state.selectedPTMPlacement}/>
        </div>

        <div className="panel panel-default" id="sequenceBox">
          <SequenceBox sequence={peptideSequence}
                       bFound={bFound}
                       yFound={yFound}/>
        </div>
        <div className="panel panel-default" id="spectra">
          <div id="fragmentSpectrumBox">
            <SpectrumBox spectrumData={spectrumData}
                         minMZ={this.state.minMZ}
                         maxMZ = {this.state.maxMZ}
                         updateMinMZ={this.updateMinMZ}
                         updateMaxMZ={this.updateMaxMZ}
                         inputDisabled={inputDisabled}
                         matchData={matchData}
                         selectedPTMPlacement={this.state.selectedPTMPlacement}
                         updateChoice={this.updateChoice}
                         pointChosenCallback={this.updateSelectedMz}/>
          </div>
          <div id="precursorSpectrumBox">
            <PrecursorSpectrumBox spectrumData={precursorSpectrumData}
                                  precursorMz={precursorMz}
                                  chargeState={chargeState}
                                  ppm={50}/>                     
          </div>
          <div id="quantSpectrumBox">
            <QuantSpectrumBox spectrumData={quantSpectrumData}
                                  quantMz={quantMz}
                                  ppm={50}/>                     
          </div>
        </div>
        <button id="save" onClick={this.save}>Save</button>
      </div>
    )     
    
  }
});

ReactDOM.render(
  <ViewBox />, 
  document.getElementById('content')
);

