for (var suite in cases) {
  (function(suite) {
    describe(suite, function(){
      for (var section in cases[suite]) {
        (function(section) {
          describe(section, function() {
            cases[suite][section].forEach(function(testCase){
              var tester = testers.getTester(suite, section);
              it(testCase.description, function(){
                chai.expect(tester(testCase)).to.deep.equal(testCase.expected);
              });
            });
          });
        }(section));
      }
    });
  }(suite));
}
