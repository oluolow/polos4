      {/* Day Detail Dialog */}
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Details - {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </DialogTitle>
            <DialogDescription>
              Complete breakdown of income, expenses, and transactions for this day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(() => {
              if (!selectedDate) return null;
              
              const entry = dailyEntries?.find(e => new Date(e.date).toISOString().startsWith(selectedDate));
              const dayTransactions = transactions?.filter(t => t.date.startsWith(selectedDate)) || [];
              const day = parseInt(selectedDate.split('-')[2]);
              const recurringForDay = recurringExpenses?.filter(exp => exp.dayOfMonth === day) || [];
              
              return (
                <>
                  {/* Income Section */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h3 className="font-bold text-lg mb-3 text-green-700">💰 Income</h3>
                    <div className="space-y-2">
                      {entry ? (
                        <>
                          <div className="flex justify-between">
                            <span>Uber</span>
                            <span className="font-semibold text-green-600">£{parseFloat(entry.uber).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bolt</span>
                            <span className="font-semibold text-green-600">£{parseFloat(entry.bolt).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>FreeNow</span>
                            <span className="font-semibold text-green-600">£{parseFloat(entry.freenow).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Horizon Cars</span>
                            <span className="font-semibold text-green-600">£{parseFloat(entry.horizoncars).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Other</span>
                            <span className="font-semibold text-green-600">£{parseFloat(entry.other).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-bold">Total Income</span>
                            <span className="font-bold text-green-600">
                              £{(parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)).toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">No income recorded for this day</p>
                      )}
                    </div>
                  </div>

                  {/* Expenses Section */}
                  <div className="border rounded-lg p-4 bg-red-50">
                    <h3 className="font-bold text-lg mb-3 text-red-700">💸 Expenses</h3>
                    <div className="space-y-2">
                      {entry && parseFloat(entry.expenses) > 0 && (
                        <div className="flex justify-between">
                          <span>Daily Expenses</span>
                          <span className="font-semibold text-red-600">£{parseFloat(entry.expenses).toFixed(2)}</span>
                        </div>
                      )}
                      {recurringForDay.length > 0 && (
                        <>
                          {recurringForDay.map(exp => (
                            <div key={exp.id} className="flex justify-between">
                              <span>📌 {exp.name} {exp.category && `(${exp.category})`}</span>
                              <span className="font-semibold text-orange-600">£{parseFloat(exp.amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {(!entry || parseFloat(entry.expenses) === 0) && recurringForDay.length === 0 && (
                        <p className="text-gray-500">No expenses for this day</p>
                      )}
                    </div>
                  </div>

                  {/* Bank Transactions Section */}
                  {dayTransactions.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h3 className="font-bold text-lg mb-3 text-blue-700">🏦 Imported Bank Transactions</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dayTransactions.map(txn => (
                          <div key={txn.id} className="flex justify-between items-start p-2 bg-white rounded border">
                            <div className="flex-1">
                              <div className="font-medium">{txn.description}</div>
                              {txn.category && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Category: {txn.category}
                                </div>
                              )}
                              {txn.source && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Source: {txn.source}
                                </div>
                              )}
                            </div>
                            <div className={`font-semibold ml-4 ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {parseFloat(txn.amount) >= 0 ? '+' : ''}£{Math.abs(parseFloat(txn.amount)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {entry?.notes && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-bold text-lg mb-2">📝 Notes</h3>
                      <p className="text-gray-700">{entry.notes}</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="border-2 rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h3 className="font-bold text-lg mb-3">📊 Daily Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Income</span>
                        <span className="font-semibold text-green-600">
                          £{entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Expenses</span>
                        <span className="font-semibold text-red-600">
                          £{((entry ? parseFloat(entry.expenses) : 0) + recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-bold text-lg">Net Balance</span>
                        <span className={`font-bold text-lg ${
                          (entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)) : 0) - 
                          ((entry ? parseFloat(entry.expenses) : 0) + recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0)) >= 0 
                          ? 'text-green-600' : 'text-red-600'
                        }`}>
                          £{((entry ? (parseFloat(entry.uber) + parseFloat(entry.bolt) + parseFloat(entry.freenow) + parseFloat(entry.horizoncars) + parseFloat(entry.other)) : 0) - 
                          ((entry ? parseFloat(entry.expenses) : 0) + recurringForDay.reduce((sum, exp) => sum + parseFloat(exp.amount), 0))).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDayDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
